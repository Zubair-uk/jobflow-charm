import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const sendTestLeadWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Insert directly via the admin client. We previously POSTed to
    // /api/public/leads-webhook, but the Lovable preview origin redirects
    // unauthenticated POSTs to an auth-bridge — fetch follows the 302,
    // gets HTML back as 200, and the test reports success while nothing
    // is actually inserted. Going through supabaseAdmin runs the exact
    // same insert path the webhook handler uses, with no HTTP hop.
    const insert = {
      user_id: context.userId,
      full_name: "Test Estate Lead",
      name: "Test Estate Lead",
      email: "test@example.com",
      phone: "07123456789",
      property_interest: "2-bed flat in Reading",
      property: "2-bed flat in Reading",
      lead_source: "Website enquiry",
      status: "New",
      ai_reply:
        "Thank you for your enquiry. One of our team will contact you shortly.",
    };

    const { data, error } = await supabaseAdmin
      .from("leads")
      .insert(insert)
      .select("*")
      .single();

    console.log("[test-webhook] insert result", { error, data });

    if (error) {
      return { ok: false, status: 500, error: error.message };
    }
    return {
      ok: true,
      status: 201,
      response: JSON.stringify({ inserted: data }, null, 2),
    };
  });

export const getLeadsDebugInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ count: totalCount }, { count: mineCount }, { data: recent }] =
      await Promise.all([
        supabaseAdmin.from("leads").select("*", { count: "exact", head: true }),
        supabaseAdmin
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", context.userId),
        supabaseAdmin
          .from("leads")
          .select("id, user_id, full_name, email, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
    return {
      userId: context.userId,
      totalCount: totalCount ?? 0,
      mineCount: mineCount ?? 0,
      recent: recent ?? [],
    };
  });