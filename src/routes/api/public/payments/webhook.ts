import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  verifyWebhook,
  EventName,
  type PaddleEnv,
} from "@/lib/paddle.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function planCodeFromProduct(productExternalId: string | undefined): string {
  if (productExternalId === "starter_plan") return "starter";
  if (productExternalId === "pro_plan") return "pro";
  return "free_trial";
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

  await supabase
    .from("organizations")
    .update({
      plan: planCode,
      billing_status: status,
      current_period_end: currentBillingPeriod?.endsAt ?? null,
      paddle_customer_id: customerId,
      paddle_subscription_id: id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);
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

  // Mirror status onto organization
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("organization_id, plan_code")
    .eq("paddle_subscription_id", id)
    .maybeSingle();
  if (sub?.organization_id) {
    await supabase
      .from("organizations")
      .update({
        billing_status: status,
        current_period_end: currentBillingPeriod?.endsAt ?? null,
        ...(planCode ? { plan: planCode } : { plan: sub.plan_code }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.organization_id);
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  const supabase = getSupabase();
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