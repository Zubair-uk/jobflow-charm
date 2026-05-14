import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";

export const sendTestLeadWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const secret = process.env.N8N_WEBHOOK_SECRET;
    if (!secret) {
      return { ok: false, status: 500, error: "Webhook secret not configured" };
    }

    const host = getRequestHost();
    const url = `https://${host}/api/public/leads-webhook`;

    const payload = {
      user_id: context.userId,
      full_name: "Test Estate Lead",
      email: "test@example.com",
      phone: "07123456789",
      property_interest: "2-bed flat in Reading",
      lead_source: "Website enquiry",
      status: "New",
      ai_reply:
        "Thank you for your enquiry. One of our team will contact you shortly.",
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": secret,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, error: text };
    }
    return { ok: true, status: res.status, response: text };
  });