import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles, Clock, Activity, Mail, Webhook, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useOrg } from "@/hooks/use-org";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getBillingOverview, createBillingPortalSession } from "@/lib/billing.functions";
import { usePaddleCheckout } from "@/hooks/use-paddle-checkout";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — JobFlow AI" },
      { name: "description", content: "Manage your JobFlow AI subscription." },
    ],
  }),
  component: Page,
});

type Overview = Awaited<ReturnType<typeof getBillingOverview>>;

function Page() {
  const { orgId } = useOrg();
  const fetchOverview = useServerFn(getBillingOverview);
  const openPortal = useServerFn(createBillingPortalSession);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();

  useEffect(() => {
    if (!orgId) return;
    void fetchOverview({ data: { organizationId: orgId } })
      .then(setOverview)
      .catch(() => toast.error("Could not load billing"));
    // Show toast on return from successful checkout
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Lifetime access activated. Welcome aboard!");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [orgId, fetchOverview]);

  const onUpgrade = async (priceId: string) => {
    if (!orgId) return;
    try {
      await openCheckout({ priceId, organizationId: orgId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open checkout");
    }
  };

  const onManage = async () => {
    if (!orgId) return;
    setPortalLoading(true);
    try {
      const { url } = await openPortal({ data: { organizationId: orgId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const plan = overview?.plan;
  const planLabel = plan?.name ?? "Free Trial";
  const trialDaysRemaining = overview?.trial.days_remaining ?? null;
  const isTrialExpired = overview?.trial.is_expired ?? false;
  const trialEndsAt = overview?.trial.ends_at ? new Date(overview.trial.ends_at) : null;
  const usage = overview?.usage;
  const lifetimePlan = overview?.plans.find((p) => p.code === "lifetime");
  const currentPlanCode = overview?.subscription?.plan_code ?? overview?.organization?.plan ?? "free_trial";
  const isLifetime = currentPlanCode === "lifetime";
  // Lifetime is a one-time purchase, not a recurring subscription — there's
  // no Paddle subscription to manage via the customer portal.
  const hasPaidSubscription =
    !isLifetime &&
    !!overview?.subscription?.paddle_subscription_id &&
    overview.subscription.status !== "canceled";

  const planBadge = isLifetime
    ? { className: "bg-success/10 text-success border-success/20", text: "Lifetime" }
    : isTrialExpired
      ? { className: "bg-destructive/10 text-destructive border-destructive/20", text: "Expired" }
      : hasPaidSubscription
        ? { className: "bg-success/10 text-success border-success/20", text: overview?.subscription?.status ?? "Active" }
        : { className: "bg-info/10 text-info border-info/20", text: "Trialing" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and plan.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</p>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-xl font-semibold text-foreground">{planLabel}</h2>
              <Badge variant="outline" className={planBadge.className}>{planBadge.text}</Badge>
            </div>
            {currentPlanCode === "free_trial" && trialEndsAt && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {isTrialExpired
                  ? `Trial ended ${trialEndsAt.toLocaleDateString()}`
                  : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} remaining (ends ${trialEndsAt.toLocaleDateString()})`}
              </p>
            )}
          </div>
          {isLifetime ? null : hasPaidSubscription ? (
            <Button variant="outline" onClick={onManage} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Manage subscription
            </Button>
          ) : (
            <Button onClick={() => onUpgrade("lifetime")} disabled={checkoutLoading}>
              {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Get lifetime access
            </Button>
          )}
        </div>
      </div>

      {/* Usage this month */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Usage this month</h3>
          {usage?.period_month && (
            <span className="text-xs text-muted-foreground">({usage.period_month})</span>
          )}
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <UsageStat
            icon={<Sparkles className="h-4 w-4" />}
            label="Leads processed"
            value={usage?.leads_processed ?? 0}
            limit={plan?.leads_limit ?? null}
          />
          <UsageStat
            icon={<Mail className="h-4 w-4" />}
            label="AI replies generated"
            value={usage?.ai_replies_generated ?? 0}
            limit={plan?.ai_replies_limit ?? null}
          />
          <UsageStat
            icon={<Webhook className="h-4 w-4" />}
            label="Webhook calls"
            value={usage?.webhook_calls ?? 0}
            limit={plan?.webhook_calls_limit ?? null}
          />
        </div>
      </div>

      <div className="grid gap-6 max-w-md">
        <PlanCard
          plan={lifetimePlan}
          fallbackName="Lifetime"
          fallbackPrice={29900}
          priceSuffix="one-time"
          fallbackFeatures={[
            "AI lead CRM",
            "Native webhook/API ingest",
            "AI extraction & replies",
            "Email automation",
            "Up to 200 leads/month",
            "Pay once, use forever",
          ]}
          highlight
          currentPlanCode={currentPlanCode}
          planCode="lifetime"
          loading={checkoutLoading}
          onUpgrade={() => onUpgrade("lifetime")}
        />
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  fallbackName,
  fallbackPrice,
  priceSuffix = "/month",
  fallbackFeatures,
  highlight,
  currentPlanCode,
  planCode,
  loading,
  onUpgrade,
}: {
  plan: { name: string; price_cents: number; features: unknown } | null | undefined;
  fallbackName: string;
  fallbackPrice: number;
  priceSuffix?: string;
  fallbackFeatures: string[];
  highlight?: boolean;
  currentPlanCode: string;
  planCode: "lifetime";
  loading: boolean;
  onUpgrade: () => void;
}) {
  const isCurrent = currentPlanCode === planCode;
  const features = (plan?.features as string[] | undefined) ?? fallbackFeatures;
  return (
    <div
      className={
        highlight
          ? "rounded-xl border-2 border-primary bg-card p-6 shadow-[var(--shadow-elegant)] relative overflow-hidden"
          : "rounded-xl border border-border bg-card p-6 relative"
      }
    >
      {highlight && (
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 blur-2xl" />
      )}
      <div className="relative">
        {highlight && (
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              One-time payment
            </span>
          </div>
        )}
        <h3 className="text-2xl font-semibold text-foreground">{plan?.name ?? fallbackName}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">
            £{((plan?.price_cents ?? fallbackPrice) / 100).toFixed(0)}
          </span>
          <span className="text-sm text-muted-foreground">{priceSuffix}</span>
        </div>
        <ul className="mt-5 space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-foreground">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-primary" />
              </div>
              {f}
            </li>
          ))}
        </ul>
        <Button
          className="w-full mt-6"
          variant={highlight ? "default" : "outline"}
          onClick={onUpgrade}
          disabled={loading || isCurrent}
        >
          {isCurrent ? "Current plan" : `Get ${plan?.name ?? fallbackName} access`}
        </Button>
      </div>
    </div>
  );
}

function UsageStat({
  icon,
  label,
  value,
  limit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  limit: number | null;
}) {
  const pct = limit && limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-foreground">{value.toLocaleString()}</span>
        {limit !== null && (
          <span className="text-xs text-muted-foreground">/ {limit.toLocaleString()}</span>
        )}
      </div>
      {limit !== null && <Progress value={pct} className="h-1.5" />}
    </div>
  );
}