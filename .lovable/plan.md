# Auth + Multi-Tenant Workspaces for JobFlow AI

Auth already exists (login/signup/Google, AuthProvider, route guard in `__root.tsx`). This plan adds the workspace layer on top.

## 1. Database (one migration)

**New tables**
- `organizations` — `id`, `name`, `slug`, `owner_id`, `created_at`
- `organization_members` — `id`, `organization_id`, `user_id`, `role` (`admin`|`agent`|`staff`), `created_at`, unique(`org_id`,`user_id`)
- `organization_invites` — `id`, `organization_id`, `email`, `role`, `token`, `invited_by`, `accepted_at`, `expires_at`

**Enum:** `app_role` = `admin | agent | staff`

**Existing tables — add `organization_id uuid`** to: `leads`, `ai_replies`, `settings`, `integrations`. Keep `user_id` for backfill and webhook compatibility.

**Backfill:** For every existing auth user without a membership, create an org named "{display_name}'s Workspace" with that user as `admin`. Backfill all existing rows' `organization_id` from `user_id` → that user's org.

**Helper functions (SECURITY DEFINER, avoid RLS recursion):**
- `current_user_org_id()` → uuid
- `has_role(_user_id uuid, _org_id uuid, _role app_role)` → bool
- `is_org_member(_user_id uuid, _org_id uuid)` → bool

**Trigger:** on `auth.users` insert → if `raw_user_meta_data.company_name` present, create org + admin membership. Otherwise leave for onboarding screen.

**Updated RLS (org-scoped):**
- `leads`, `ai_replies`, `settings`, `integrations`: SELECT/INSERT/UPDATE/DELETE allowed when `organization_id = current_user_org_id()`. Admin can do everything; agent/staff can read/write leads & replies but not settings/integrations (write).
- `organizations`: members can SELECT; only admins UPDATE.
- `organization_members`: members SELECT own org; only admins INSERT/UPDATE/DELETE.
- `organization_invites`: admins manage; anyone can SELECT by token to accept.

## 2. Webhook compatibility (critical — must not break)

The webhook currently inserts with `HARDCODED_USER_ID`. To keep n8n working:
- Look up that user's `organization_id` once per request (server-side, admin client) and write both `user_id` AND `organization_id` on the lead.
- No payload changes. n8n keeps posting the same body.

## 3. Onboarding

- New route `/onboarding` (protected). If signed-in user has **no** membership → redirect here from `__root.tsx` guard.
- Form: company name → creates org + admin membership → redirects to `/`.

## 4. Auth pages

- Existing `/auth` already covers login + signup + Google → keep, add link to forgot password.
- New `/forgot-password` → `supabase.auth.resetPasswordForEmail`.
- New `/reset-password` (public) → `supabase.auth.updateUser({ password })`.

## 5. Settings — Team section (real, not local state)

Rebuild the existing Team block to use Supabase:
- List `organization_members` joined to `profiles` (name, email via admin lookup server fn).
- Invite by email → inserts `organization_invites` row, generates token, shows shareable link `/accept-invite?token=…`. (Email sending out of scope for this pass — flagged in note.)
- Change role / remove member (admin only).
- New route `/accept-invite` → validates token, creates membership for signed-in user, redirects to `/`.

## 6. Role-aware UI

- `useOrg()` hook exposes `{ orgId, role, isAdmin }`.
- Hide Settings → Team/Integrations write actions and Billing destructive actions for non-admins.
- Server functions enforce role via `has_role()` — UI is hint only.

## 7. Files touched

**Created**
- `supabase/migrations/<ts>_workspaces.sql`
- `src/routes/onboarding.tsx`
- `src/routes/forgot-password.tsx`
- `src/routes/reset-password.tsx`
- `src/routes/accept-invite.tsx`
- `src/hooks/use-org.tsx`
- `src/lib/org.functions.ts` (list members, invite, change role, remove, accept invite — uses `requireSupabaseAuth`)

**Edited**
- `src/routes/__root.tsx` — onboarding redirect when no membership
- `src/routes/auth.tsx` — link to forgot password
- `src/routes/api/public/leads-webhook.ts` — also write `organization_id`
- `src/routes/settings.tsx` — real Team section, role-gated UI
- `src/routes/leads.tsx`, `src/routes/index.tsx`, `src/routes/ai-replies.tsx` — query by `organization_id` (RLS does the heavy lifting; queries already use `auth.uid()` via RLS so most code keeps working, but explicit filter for clarity)

## What I won't touch

- Webhook payload schema / n8n contract
- Existing AI replies logic
- Lovable AI / billing pages beyond role-gating destructive actions

## Open questions / notes

1. **Invite email delivery** — this plan generates a shareable invite link but does NOT send the email. Want me to wire up Lovable transactional email in this pass, or ship the link-copy flow first?
2. **Existing single-tenant webhook user** — the hardcoded `HARDCODED_USER_ID` will resolve to one org. All n8n leads land there. OK as a starting point; future work would be a per-org webhook secret.

Reply with answers (or "go") and I'll execute.