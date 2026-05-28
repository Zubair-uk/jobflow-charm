import { AlertTriangle, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useOrg } from "@/hooks/use-org";
import { getBillingOverview } from "@/lib/billing.functions";

/**
 * Surfaces billing lifecycle states to the user:
 *  - past_due  → 7-day grace banner, then locked
 *  - canceled  → access until current_period_end
 *  - trial expired
 */
export function BillingStatusBanner() {
  const { orgId } = useOrg();
  const fetchOverview = useServerFn(getBillingOverview);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getBillingOverview>> | null>(null);

  useEffect(() => {
    if (!orgId) return;
    void fetchOverview({ data: { organizationId: orgId } }).then(setOverview).catch(() => {});
  }, [orgId, fetchOverview]);

  if (!overview) return null;

  const status = overview.subscription?.status;
  const periodEnd = overview.subscription?.current_period_end
    ? new Date(overview.subscription.current_period_end)
    : null;
  const trialExpired = overview.trial.is_expired;
  const cancelPending = overview.subscription?.cancel_at_period_end;

  if (status === "past_due") {
    return (
      <Banner tone="warning">
        <AlertTriangle className="h-4 w-4" />
        Your last payment failed. Please update your payment method within 7 days to keep access.{" "}
        <Link to="/billing" className="underline font-medium">Manage billing</Link>
      </Banner>
    );
  }

  if (status === "canceled" && periodEnd && periodEnd > new Date()) {
    return (
      <Banner tone="info">
        <Clock className="h-4 w-4" />
        Your subscription is canceled. Access continues until {periodEnd.toLocaleDateString()}.{" "}
        <Link to="/billing" className="underline font-medium">Reactivate</Link>
      </Banner>
    );
  }

  if (cancelPending && periodEnd) {
    return (
      <Banner tone="info">
        <Clock className="h-4 w-4" />
        Subscription will end on {periodEnd.toLocaleDateString()}.{" "}
        <Link to="/billing" className="underline font-medium">Resume</Link>
      </Banner>
    );
  }

  if (trialExpired) {
    return (
      <Banner tone="warning">
        <AlertTriangle className="h-4 w-4" />
        Your free trial has ended. Upgrade to continue using JobFlow AI.{" "}
        <Link to="/billing" className="underline font-medium">Choose a plan</Link>
      </Banner>
    );
  }

  return null;
}

function Banner({ children, tone }: { children: React.ReactNode; tone: "warning" | "info" }) {
  const cls =
    tone === "warning"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : "bg-info/10 text-info border-info/20";
  return (
    <div className={`w-full border-b px-4 py-2 text-center text-sm flex items-center justify-center gap-2 ${cls}`}>
      {children}
    </div>
  );
}