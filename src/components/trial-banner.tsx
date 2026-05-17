import { Link } from "@tanstack/react-router";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/hooks/use-org";

export function TrialBanner() {
  const { plan, trialDaysRemaining, isTrialExpired } = useOrg();
  if (plan !== "free_trial") return null;

  if (isTrialExpired) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Your free trial has ended</p>
            <p className="text-xs text-muted-foreground">
              AI replies, webhooks and new leads are paused. Upgrade to restore full access.
            </p>
          </div>
        </div>
        <Link to="/billing"><Button size="sm">Upgrade now</Button></Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary-glow/10 p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Your free trial ends in {trialDaysRemaining} {trialDaysRemaining === 1 ? "day" : "days"}
          </p>
          <p className="text-xs text-muted-foreground">Upgrade anytime to keep AI replies running without interruption.</p>
        </div>
      </div>
      <Link to="/billing"><Button size="sm" variant="outline">Upgrade</Button></Link>
    </div>
  );
}
