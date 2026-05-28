import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

async function assertMember(userId: string, orgId: string) {
  const { data } = await supabaseAdmin
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const getBillingOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context.userId, data.organizationId);

    const [orgRes, subRes, usageRes, plansRes] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select(
          "id, name, business_name, plan, billing_status, trial_started_at, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id",
        )
        .eq("id", data.organizationId)
        .maybeSingle(),
      supabaseAdmin
        .from("subscriptions")
        .select(
          "plan_code, status, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end",
        )
        .eq("organization_id", data.organizationId)
        .maybeSingle(),
      supabaseAdmin
        .from("usage_counters")
        .select("leads_processed, ai_replies_generated, webhook_calls, period_month")
        .eq("organization_id", data.organizationId)
        .eq("period_month", currentPeriod())
        .maybeSingle(),
      supabaseAdmin
        .from("plans")
        .select(
          "code, name, price_cents, currency, interval, leads_limit, ai_replies_limit, webhook_calls_limit, features, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (orgRes.error) throw new Error(orgRes.error.message);

    const planCode = subRes.data?.plan_code ?? orgRes.data?.plan ?? "free_trial";
    const plan = (plansRes.data ?? []).find((p) => p.code === planCode) ?? null;
    const trialEndsAt = subRes.data?.trial_ends_at ?? orgRes.data?.trial_ends_at ?? null;
    const trialDaysRemaining = trialEndsAt
      ? Math.max(
          0,
          Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000),
        )
      : null;

    return {
      organization: orgRes.data,
      subscription: subRes.data,
      plan,
      plans: plansRes.data ?? [],
      usage: usageRes.data ?? {
        leads_processed: 0,
        ai_replies_generated: 0,
        webhook_calls: 0,
        period_month: currentPeriod(),
      },
      trial: {
        ends_at: trialEndsAt,
        days_remaining: trialDaysRemaining,
        is_expired:
          planCode === "free_trial" &&
          !!trialEndsAt &&
          new Date(trialEndsAt).getTime() <= Date.now(),
      },
    };
  });

const TenantSettingsSchema = z.object({
  organizationId: z.string().uuid(),
  business_name: z.string().trim().min(1).max(120).optional(),
  ai_tone: z.enum(["Professional", "Friendly", "Luxury", "Formal"]).optional(),
  signature: z.string().trim().max(2000).optional().nullable(),
  contact_email: z.string().trim().email().max(255).optional().nullable(),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  office_hours: z
    .object({
      monday_friday: z.string().trim().max(60).optional(),
      saturday: z.string().trim().max(60).optional(),
      sunday: z.string().trim().max(60).optional(),
      timezone: z.string().trim().max(60).optional(),
    })
    .partial()
    .optional(),
});

export const updateTenantSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof TenantSettingsSchema>) =>
    TenantSettingsSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: member } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("user_id", context.userId)
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    if (!member || member.role !== "admin") throw new Error("Forbidden: admin only");

    const { error } = await supabaseAdmin
      .from("organizations")
      .update({
        ...(data.business_name !== undefined && { business_name: data.business_name }),
        ...(data.ai_tone !== undefined && { ai_tone: data.ai_tone }),
        ...(data.signature !== undefined && { signature: data.signature }),
        ...(data.contact_email !== undefined && { contact_email: data.contact_email }),
        ...(data.contact_phone !== undefined && { contact_phone: data.contact_phone }),
        ...(data.office_hours !== undefined && { office_hours: data.office_hours }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.organizationId);
    if (error) throw new Error(error.message);
    return { success: true };
  });