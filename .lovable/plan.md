# Native Automation Migration Plan

Goal: replace n8n with native JobFlow AI automation. The existing `/api/public/leads-webhook` and any n8n flows keep working untouched during the entire migration. Native pipeline is built side-by-side and only becomes the default once it's proven per-org.

## Architecture overview

```text
Inbound sources                Native pipeline                       Storage
---------------                ----------------                      -------
Gmail (OAuth, per-user) ─┐
Outlook (OAuth, per-user)├─► ingestEmail() ─► extractLead() ─► matchProperty() ─► leads
Website webhook forms ───┤        │                │
n8n (legacy, unchanged) ─┘        │                ├─► generateReply() ─► ai_replies
                                  │                │
                                  └─► sendReply() ◄┘   (Gmail/Outlook/Lovable Email)

Per-org config in `integrations` table:
  provider: gmail | outlook | website_webhook
  config: { connection_id, webhook_token, auto_reply, signature }
```

## What stays as-is (do not touch)

- `src/routes/api/public/leads-webhook.ts` — current n8n entry point.
- Hardcoded webhook user/org fallback in that route.
- Existing leads, AI replies, properties, billing, trial logic.
- `N8N_WEBHOOK_SECRET` and any n8n flows.

## Phase 1 — Foundations (schema + secrets + shared code)

1. Database migration:
   - Add `webhook_tokens` table: `id, organization_id, token (unique), label, source ('website'|'gmail'|'outlook'|'generic'), created_by, last_used_at, revoked_at, created_at`. RLS scoped to org admins for read/write; service_role full access. Token is opaque random (32 bytes hex).
   - Extend `integrations.config` usage (no schema change needed — it's `jsonb`) to store `{ connection_id, scopes, email_address, auto_reply: bool, signature }`.
   - Add `lead_source` enum-ish text values we'll standardize on: `gmail`, `outlook`, `website`, `n8n`, `manual`.
2. Secrets: ensure `LOVABLE_API_KEY` is set (already present). No new secrets needed for AI; Gmail/Outlook use the per-user OAuth connector flow (no API keys to store).
3. Shared server-only modules under `src/lib/automation/`:
   - `extract-lead.server.ts` — pure helpers (already partly in webhook): `stripHtml`, `extractNameFromSignature`, `extractUkPhone`, `isPlaceholderName`. Move out of the webhook so both pipelines share them.
   - `ai.server.ts` — Lovable AI Gateway provider (per `ai-sdk-lovable-gateway`).
   - `match-property.server.ts` — property matching helper from current webhook.
   - `ingest-lead.server.ts` — single entry: takes a normalized `IncomingLead` ({ orgId, source, fromEmail, fromName, subject, body, rawHtml, receivedAt }), runs extraction → property match → insert → enqueue reply.
   - `send-reply.server.ts` — abstraction with `sendVia({ provider, connectionId, to, subject, body })` that dispatches to Gmail/Outlook gateway helpers; logs to `ai_replies`.

Refactor the existing n8n webhook to call `ingestLead()` so both pipelines share the exact same logic (no behavior change to n8n).

## Phase 2 — Integrations page + webhook tokens

1. New route `src/routes/integrations.tsx` (rebuilt) with three cards:
   - **Gmail** — "Connect Gmail" button → server fn `startGmailConnect` (uses `authorizeAppUserOAuth` per `tanstack-app-user-connector`); after return, server fn `saveGmailConnection` upserts `integrations` row `{ provider: 'gmail', connected: true, config: { connection_id, email_address, scopes } }`.
   - **Outlook** — same shape with `microsoft_outlook` connector.
   - **Website webhook** — list tokens, "Generate token" / "Revoke" buttons. Shows the stable URL: `https://project--becc696a-…-dev.lovable.app/api/public/leads/ingest?token=…` (and prod equivalent).
2. Server functions (`src/lib/integrations.functions.ts`): admin-only via `requireSupabaseAuth` + role check; never expose `LOVABLE_API_KEY` or connection IDs to non-members.
3. Return URL route `src/routes/integrations.oauth-return.tsx` parses `connection_id` and persists via `saveGmailConnection` / `saveOutlookConnection`.

## Phase 3 — Native website webhook

1. New server route `src/routes/api/public/leads/ingest.ts` (TanStack server route, not n8n):
   - Auth: `?token=…` matched against `webhook_tokens` (active, not revoked), resolves to `organization_id`. Updates `last_used_at`. 401 on bad token.
   - Trial-active check via existing `orgHasActiveAccess`.
   - Zod schema for body (looser than n8n; supports `name/email/phone/message/subject/property`).
   - Calls `ingestLead({ orgId, source: 'website', … })`.
   - Returns `{ id, created_at }`.
2. Old `/api/public/leads-webhook` remains untouched — both routes write through `ingestLead`.

## Phase 4 — AI: extract + reply

Two server functions in `src/lib/automation/ai.functions.ts`:

1. `extractLeadDetails(rawEmail)` — uses `generateText` with `Output.object({ schema })` returning `{ full_name, phone, property_interest, intent, summary }`. Default model `google/gemini-3-flash-preview`. Falls back to regex helpers when the AI call errors/rate-limits (429/402) so ingestion never blocks.
2. `generateLeadReply({ lead, property, settings })` — `generateText` with system prompt seeded from `settings` (agent name, tone, signature). Returns `{ subject, body }`. Same fallback: on AI error, write nothing and mark `ai_reply` null (lead is still saved).

Wired inside `ingestLead`:
```
extract → upsert lead → if integration.auto_reply: generateReply → sendReply → insert ai_replies (status sent|failed)
```

## Phase 5 — Email ingestion (Gmail / Outlook)

Pull model first (simpler than push subscriptions, no extra infra):

1. Server fn `pollMailbox(orgId, provider)` — uses `callAsAppUser` against gateway:
   - Gmail: `GET /gmail/v1/users/me/messages?q=is:unread newer_than:1d -label:JOBFLOW_PROCESSED`.
   - Outlook: `GET /me/messages?$filter=isRead eq false&$top=25`.
2. For each new message: fetch body, call `ingestLead({ source: provider, … })`, then mark processed (Gmail label, Outlook `isRead: true`).
3. Trigger: poll on page load of Inbox/Dashboard (cheap, per-org) + a manual "Sync now" button on Integrations. Cron is deferred to Phase 7.

## Phase 6 — Reply sending

`send-reply.server.ts` dispatches by provider:
- `gmail`: `POST /gmail/v1/users/me/messages/send` with RFC2822+base64url.
- `outlook`: `POST /me/sendMail` with JSON payload.
- `website`/`n8n`/no-mailbox: fall back to Lovable Email (transactional) if configured; otherwise store reply with `status: 'draft'` for the user to send manually.

## Phase 7 — Cutover (NOT in this PR)

Once the native website webhook is live and per-org Gmail/Outlook is connected:
- Add a UI toggle `Use native pipeline` per org (default off).
- When on, ask the user to point n8n at the new URL or disable the n8n flow.
- After 2 weeks of stable native processing, mark `/api/public/leads-webhook` deprecated (still works, logs a warning header).

## What I'll build in the first implementation batch

To keep this PR reviewable, the first batch ships **Phases 1–3** end-to-end:

1. Migration: `webhook_tokens` table + RLS + grants.
2. `src/lib/automation/{extract-lead,match-property,ingest-lead}.server.ts` and a thin refactor of `leads-webhook.ts` to call `ingestLead` (behavior preserved).
3. `src/lib/integrations.functions.ts` with token CRUD + Gmail/Outlook OAuth start/save (uses `appUserConnector` helper — created if missing).
4. `src/routes/integrations.tsx` rebuild with the three cards.
5. `src/routes/api/public/leads/ingest.ts` (org-token webhook), shares `ingestLead`.

Phases 4–6 (AI extract/reply + mailbox poll + send abstraction) land in a follow-up PR so we can validate ingestion + tokens first without touching AI quotas or live mailboxes.

## Risks / open questions

- **Gmail/Outlook connector setup**: per-user OAuth needs `connectorClientId` values. If those aren't provisioned in this workspace, the Connect buttons will surface a clear error and we'll prompt the user to provision via the connector flow before Phase 5.
- **Webhook token rotation**: users will need to update any external systems pointing at old URLs. UI shows "last used" so they can confirm before revoking.
- **AI cost/latency at ingest time**: extraction + reply on every inbound email. Phase 4 will gate reply generation behind a per-integration `auto_reply` toggle (default off) so it's opt-in.

Approve to proceed with the first batch (Phases 1–3).
