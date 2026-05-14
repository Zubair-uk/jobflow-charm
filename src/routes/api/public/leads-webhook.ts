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

const STATUSES = ["New", "Qualified", "Follow-up", "Closed"] as const;

const LeadSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  property_interest: z.string().trim().max(500).optional().nullable(),
  lead_source: z.string().trim().max(100).optional().nullable(),
  status: z.enum(STATUSES).optional().default("New"),
  ai_reply: z.string().trim().max(5000).optional().nullable(),
  created_at: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/leads-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        const expected = process.env.N8N_WEBHOOK_SECRET;
        if (!expected) {
          return json({ error: "Webhook secret not configured" }, 500);
        }

        const provided =
          request.headers.get("x-webhook-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!provided || provided !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

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
        const insert = {
          user_id: d.user_id,
          full_name: d.full_name,
          name: d.full_name,
          email: d.email ?? null,
          phone: d.phone ?? null,
          property_interest: d.property_interest ?? null,
          property: d.property_interest ?? null,
          lead_source: d.lead_source ?? null,
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

        return json({ success: true, lead: data }, 201);
      },
    },
  },
});