import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getOrgWebhookOwner,
  ingestLead,
  orgHasActiveAccess,
} from "@/lib/automation/ingest-lead.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const str = (max: number) => z.string().trim().max(max).optional().nullable();
const Schema = z
  .object({
    full_name: str(200),
    name: str(200),
    email: str(255),
    phone: str(40),
    property_interest: str(500),
    property: str(500),
    subject: str(300),
    message: str(10000),
    notes: str(10000),
    status: str(50),
  })
  .passthrough();

export const Route = createFileRoute("/api/public/leads/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token =
          url.searchParams.get("token") ||
          request.headers.get("x-webhook-token") ||
          "";
        if (!token) {
          return json({ error: "Missing token" }, 401);
        }

        const { data: tokenRow } = await supabaseAdmin
          .from("webhook_tokens")
          .select("id, organization_id, revoked_at")
          .eq("token", token)
          .maybeSingle();

        if (!tokenRow || tokenRow.revoked_at) {
          return json({ error: "Invalid or revoked token" }, 401);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return json(
            { error: "Validation failed", issues: parsed.error.flatten() },
            400,
          );
        }

        const orgId = tokenRow.organization_id;
        if (!(await orgHasActiveAccess(orgId))) {
          return json(
            {
              error: "Trial expired. Upgrade to resume webhook processing.",
              code: "trial_expired",
            },
            402,
          );
        }

        const ownerId = await getOrgWebhookOwner(orgId);
        if (!ownerId) {
          return json({ error: "Organization owner not found" }, 500);
        }

        const d = parsed.data;
        const pick = (...vals: Array<string | null | undefined>) =>
          vals.find((v) => typeof v === "string" && v.trim().length > 0) ?? null;

        try {
          const result = await ingestLead({
            organizationId: orgId,
            ownerUserId: ownerId,
            source: "website",
            fullName: pick(d.full_name, d.name),
            email: pick(d.email),
            phone: pick(d.phone),
            propertyInterest: pick(d.property_interest, d.property),
            message: pick(d.message, d.notes),
            subject: pick(d.subject),
            status: d.status ?? "New",
          });

          await supabaseAdmin
            .from("webhook_tokens")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", tokenRow.id);

          // Track webhook usage (best-effort)
          try {
            await supabaseAdmin.rpc("increment_usage", {
              _organization_id: orgId,
              _field: "webhook_calls",
              _amount: 1,
            });
          } catch (e) {
            console.warn("[leads/ingest] usage increment failed", e);
          }

          return json({ success: true, id: result.id, created_at: result.created_at }, 201);
        } catch (e) {
          return json(
            { error: e instanceof Error ? e.message : String(e) },
            500,
          );
        }
      },
    },
  },
});