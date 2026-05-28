import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  verifyWebhook,
  EventName,
  type PaddleEnv,
} from "@/lib/paddle.server";

const getSupabase = () => supabaseAdmin;

function planCodeFromProduct(productExternalId: string | undefined): string {
  if (productExternalId === "starter_plan") return "starter";
  if (productExternalId === "pro_plan") return "pro";
  return "free_trial";
}

function currentPeriodMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

/**
 * Business rule (on purchase): activate immediately, end trial, reset usage
 * counters for the new billing period.
 */
async function resetUsageForNewPeriod(organizationId: string) {
  const period = currentPeriodMonth();
  await getSupabase()
    .from("usage_counters")
    .upsert(
      {
        organization_id: organizationId,
        period_month: period,
        leads_processed: 0,
        ai_replies_generated: 0,
        webhook_calls: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,period_month" },
    );
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const organizationId: string | undefined = customData?.organizationId;
  if (!organizationId) {
    console.error("[paddle webhook] missing customData.organizationId");
    return;
  }

  const item = items?.[0];
  const priceExternal: string | undefined = item?.price?.importMeta?.externalId;
  const productExternal: string | undefined = item?.product?.importMeta?.externalId;
  if (!priceExternal || !productExternal) {
    console.warn("[paddle webhook] missing importMeta.externalId; skipping", {
      rawPriceId: item?.price?.id,
      rawProductId: item?.product?.id,
    });
    return;
  }

  const planCode = planCodeFromProduct(productExternal);
  const supabase = getSupabase();

  await supabase.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      paddle_subscription_id: id,
      paddle_customer_id: customerId,
      provider: "paddle",
      product_id: productExternal,
      price_id: priceExternal,
      plan_code: planCode,
      status,
      current_period_start: currentBillingPeriod?.startsAt ?? null,
      current_period_end: currentBillingPeriod?.endsAt ?? null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" },
  );

  // Activate immediately, end trial. Reset usage so the new paid period
  // starts from zero.
  await supabase
    .from("organizations")
    .update({
      plan: planCode,
      billing_status: status,
      current_period_end: currentBillingPeriod?.endsAt ?? null,
      paddle_customer_id: customerId,
      paddle_subscription_id: id,
      trial_ends_at: new Date().toISOString(), // trial ends now
      past_due_since: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  await resetUsageForNewPeriod(organizationId);
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;
  const supabase = getSupabase();

  const item = items?.[0];
  const priceExternal: string | undefined = item?.price?.importMeta?.externalId;
  const productExternal: string | undefined = item?.product?.importMeta?.externalId;
  const planCode = productExternal ? planCodeFromProduct(productExternal) : undefined;

  await supabase
    .from("subscriptions")
    .update({
      status,
      current_period_start: currentBillingPeriod?.startsAt ?? null,
      current_period_end: currentBillingPeriod?.endsAt ?? null,
      cancel_at_period_end: scheduledChange?.action === "cancel",
      ...(planCode ? { plan_code: planCode } : {}),
      ...(priceExternal ? { price_id: priceExternal } : {}),
      ...(productExternal ? { product_id: productExternal } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", id)
    .eq("environment", env);

  // Mirror status onto organization. Upgrades/downgrades apply new tier
  // (and therefore new limits) immediately. Manage past-due grace window.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("organization_id, plan_code, paddle_customer_id")
    .eq("paddle_subscription_id", id)
    .maybeSingle();
  if (sub?.organization_id) {
    const effectivePlan = planCode ?? sub.plan_code;
    const orgUpdate: Record<string, unknown> = {
      billing_status: status,
      current_period_end: currentBillingPeriod?.endsAt ?? null,
      plan: effectivePlan,
      updated_at: new Date().toISOString(),
    };

    if (status === "past_due") {
      // Start the 7-day grace clock once, on the first past_due event.
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("past_due_since")
        .eq("id", sub.organization_id)
        .maybeSingle();
      if (!orgRow?.past_due_since) {
        orgUpdate.past_due_since = new Date().toISOString();
      }
    } else if (status === "active" || status === "trialing") {
      // Payment recovered — clear the grace clock.
      orgUpdate.past_due_since = null;
    }

    await supabase.from("organizations").update(orgUpdate).eq("id", sub.organization_id);

    // Upgrade/downgrade or renewal that landed on a new period: reset usage
    // counters so limits reflect the new period immediately.
    if (status === "active" && planCode) {
      await resetUsageForNewPeriod(sub.organization_id);
    }
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  const supabase = getSupabase();
  // Keep current_period_end intact — access continues until that timestamp.
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("organization_id")
    .eq("paddle_subscription_id", data.id)
    .maybeSingle();
  if (sub?.organization_id) {
    await supabase
      .from("organizations")
      .update({ billing_status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", sub.organization_id);
  }
}

async function handleTransactionPaymentFailed(data: any, env: PaddleEnv) {
  const subscriptionId: string | undefined = data?.subscriptionId;
  if (!subscriptionId) return;
  const supabase = getSupabase();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("organization_id")
    .eq("paddle_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();
  if (!sub?.organization_id) return;

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("past_due_since")
    .eq("id", sub.organization_id)
    .maybeSingle();
  if (!orgRow?.past_due_since) {
    await supabase
      .from("organizations")
      .update({
        past_due_since: new Date().toISOString(),
        billing_status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.organization_id);
  }
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionPaymentFailed:
      await handleTransactionPaymentFailed(event.data, env);
      break;
    default:
      console.log("[paddle webhook] unhandled event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[paddle webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});