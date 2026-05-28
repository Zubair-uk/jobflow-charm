import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles, Clock, Activity, Mail, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useOrg } from "@/hooks/use-org";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getBillingOverview } from "@/lib/billing.functions";

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
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    if (!orgId) return;
    void fetchOverview({ data: { organizationId: orgId } })
      .then(setOverview)
      .catch(() => toast.error("Could not load billing"));
  }, [orgId, fetchOverview]);

  const onUpgrade = () => {
    toast.info("Paid plans are coming soon. We'll email you when checkout is live.");
  };

  const plan = overview?.plan;
  const planLabel = plan?.name ?? "Free Trial";
  const trialDaysRemaining = overview?.trial.days_remaining ?? null;
  const isTrialExpired = overview?.trial.is_expired ?? false;
  const trialEndsAt = overview?.trial.ends_at ? new Date(overview.trial.ends_at) : null;
  const usage = overview?.usage;
  const upgradePlan = overview?.plans.find((p) => p.code === "starter");

  const planBadge = isTrialExpired
    ? { className: "bg-destructive/10 text-destructive border-destructive/20", text: "Expired" }
    : { className: "bg-info/10 text-info border-info/20", text: "Active" };

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
            {plan?.code === "free_trial" && trialEndsAt && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {isTrialExpired
                  ? `Trial ended ${trialEndsAt.toLocaleDateString()}`
                  : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} remaining (ends ${trialEndsAt.toLocaleDateString()})`}
              </p>
            )}
          </div>
          <Button onClick={onUpgrade}>
            <Sparkles className="h-4 w-4" /> Upgrade
          </Button>
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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border-2 border-primary bg-card p-6 shadow-[var(--shadow-elegant)] relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Most popular</span>
            </div>
            <h3 className="text-2xl font-semibold text-foreground">{upgradePlan?.name ?? "Starter"}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">
                £{((upgradePlan?.price_cents ?? 9900) / 100).toFixed(0)}
              </span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Everything you need to capture and convert leads.
            </p>
            <ul className="mt-5 space-y-2.5">
              {((upgradePlan?.features as string[] | undefined) ?? [
                "AI lead capture",
                "Auto replies",
                "CRM dashboard",
                "Email automation",
              ]).map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full mt-6" onClick={onUpgrade}>
              Upgrade to {upgradePlan?.name ?? "Starter"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground">Need more?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Custom plans for larger teams and agencies are coming soon. Get in touch to discuss.
          </p>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>· Unlimited leads & AI replies</p>
            <p>· Multi-user accounts</p>
            <p>· Custom integrations</p>
            <p>· Priority support</p>
          </div>
        </div>
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