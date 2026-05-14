import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — JobFlow AI" },
      { name: "description", content: "Manage your JobFlow AI subscription." },
    ],
  }),
  component: Page,
});

const features = [
  "AI lead capture",
  "Auto replies",
  "CRM dashboard",
  "Email automation",
];

function Page() {
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
              <h2 className="text-xl font-semibold text-foreground">Free Trial</h2>
              <Badge variant="outline" className="bg-info/10 text-info border-info/20">Active</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Upgrade to unlock unlimited usage.</p>
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
            <h3 className="text-2xl font-semibold text-foreground">Starter Plan</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">£49</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Everything you need to capture and convert leads.
            </p>
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
            <Button className="w-full mt-6" disabled>
              Stripe coming soon
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
