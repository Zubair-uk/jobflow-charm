import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";

export const sendTestLeadWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { origin?: string } | undefined) =>
    z
      .object({ origin: z.string().url().optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const secret = process.env.N8N_WEBHOOK_SECRET;
    if (!secret) {
      return { ok: false, status: 500, error: "Webhook secret not configured" };
    }

    // Prefer the origin reported by the browser (real deployed URL).
    // Fall back to forwarded headers, then the request URL itself.
    let origin = data.origin;
    if (!origin) {
      const req = getRequest();
      const fwdHost =
        req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      const fwdProto = req.headers.get("x-forwarded-proto");
      if (fwdHost) {
        const proto =
          fwdProto ??
          (fwdHost.startsWith("localhost") || fwdHost.startsWith("127.")
            ? "http"
            : "https");
        origin = `${proto}://${fwdHost}`;
      } else {
        origin = new URL(req.url).origin;
      }
    }
    const url = `${origin.replace(/\/$/, "")}/api/public/leads-webhook`;
    console.log("[test-webhook] POST", url);

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

    try {
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
        return { ok: false, status: res.status, url, error: text };
      }
      return { ok: true, status: res.status, url, response: text };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        url,
        error: `fetch ${url} failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  });