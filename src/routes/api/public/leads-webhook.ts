import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Secret",
} as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const HARDCODED_USER_ID = "7d21c6fb-09bf-47e0-b424-75838ac73a30";

let cachedOrgId: string | null = null;
async function getWebhookOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;
  const { data } = await supabaseAdmin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", HARDCODED_USER_ID)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  cachedOrgId = data?.organization_id ?? null;
  return cachedOrgId;
}

// Accept a loose payload so we can map common aliases from n8n / external sources.
const str = (max: number) => z.string().trim().max(max).optional().nullable();
const LeadSchema = z
  .object({
    full_name: str(200),
    name: str(200),
    contact_name: str(200),

    email: str(255),
    contact_email: str(255),
    sender_email: str(255),

    phone: str(40),
    contact_phone: str(40),
    phone_number: str(40),

    property_interest: str(500),
    property: str(500),

    lead_source: str(100),
    source: str(100),

    message: str(5000),
    notes: str(5000),

    status: str(50),
    ai_reply: str(5000),
    created_at: z.string().datetime().optional(),
  })
  .passthrough();

export const Route = createFileRoute("/api/public/leads-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        // TEMP: webhook auth disabled while wiring up n8n. Re-enable before going live.

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const parsed = LeadSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "Validation failed", issues: parsed.error.flatten() }, 400);
        }

        const d = parsed.data;
        const pick = (...vals: Array<string | null | undefined>) =>
          vals.find((v) => typeof v === "string" && v.trim().length > 0) ?? null;

        const fullName = pick(d.full_name, d.name, d.contact_name) ?? "Unknown";
        const email = pick(d.email, d.contact_email, d.sender_email);
        const phone = pick(d.phone, d.contact_phone, d.phone_number);
        const propertyInterest = pick(d.property_interest, d.property);
        const leadSource = pick(d.lead_source, d.source);
        const message = pick(d.message, d.notes);

        const insert = {
          user_id: HARDCODED_USER_ID,
          organization_id: await getWebhookOrgId(),
          full_name: fullName,
          name: fullName,
          email,
          phone,
          property_interest: propertyInterest,
          property: propertyInterest,
          lead_source: leadSource,
          message,
          notes: message,
          status: d.status ?? "New",
          ai_reply: d.ai_reply ?? null,
          ...(d.created_at ? { created_at: d.created_at } : {}),
        };

        const { data, error } = await supabaseAdmin
          .from("leads")
          .insert(insert)
          .select("id, created_at")
          .single();

        if (error) {
          return json({ error: error.message }, 500);
        }

        return json({ success: true, auth_disabled: true }, 201);
      },
    },
  },
});