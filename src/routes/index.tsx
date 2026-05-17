import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Loader2,
  Sparkles,
  Zap,
  Clock,
  TrendingUp,
  Bot,
  Mail,
  Phone,
  ArrowRight,
  Check,
  Star,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusVariant, type Lead } from "./leads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JobFlow AI — Never Miss Another Property Lead" },
      { name: "description", content: "AI-powered lead capture and instant replies for estate agents." },
    ],
  }),
  component: Index,
});

function Index() {
  const { session } = useAuth();
  if (!session) {
    return <LandingPage />;
  }
  return <Dashboard />;
}

/* ------------------------------------------------------------------ */
/*  Landing Page                                                       */
/* ------------------------------------------------------------------ */

function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">JobFlow AI</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Benefits</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm">Get started</Button>
              </Link>
            </div>

            <button
              className="md:hidden p-2 rounded-md hover:bg-accent"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-border px-4 py-4 space-y-3 bg-background">
            <a href="#benefits" className="block text-sm text-muted-foreground" onClick={() => setMobileNavOpen(false)}>Benefits</a>
            <a href="#how-it-works" className="block text-sm text-muted-foreground" onClick={() => setMobileNavOpen(false)}>How it works</a>
            <a href="#pricing" className="block text-sm text-muted-foreground" onClick={() => setMobileNavOpen(false)}>Pricing</a>
            <a href="#testimonials" className="block text-sm text-muted-foreground" onClick={() => setMobileNavOpen(false)}>Testimonials</a>
            <div className="flex gap-3 pt-2">
              <Link to="/auth" className="flex-1">
                <Button variant="outline" className="w-full" size="sm">Sign in</Button>
              </Link>
              <Link to="/auth" className="flex-1">
                <Button className="w-full" size="sm">Get started</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 blur-3xl" />
        <div className="absolute top-48 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-primary-glow/20 to-primary/5 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 px-3 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary">
              <Zap className="h-3 w-3 mr-1" /> AI-Powered for Estate Agents
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Never Miss Another Property Lead
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AI-powered lead capture and instant replies for estate agents. Qualify enquiries, book viewings, and close deals — while you sleep.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Book a demo
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">No credit card required. 14-day free trial.</p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-16 sm:py-24 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Everything you need to convert leads</h2>
            <p className="mt-3 text-muted-foreground">Stop losing enquiries to slow response times. JobFlow AI handles the first touch automatically.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Bot,
                title: "Instant AI Replies",
                desc: "Every enquiry gets a personalised, professional response within seconds — 24/7.",
              },
              {
                icon: Zap,
                title: "Smart Qualification",
                desc: "AI extracts buyer intent, budget signals, and urgency so you know who to call first.",
              },
              {
                icon: Clock,
                title: "Always On",
                desc: "Capture leads from portals, social, and your website around the clock.",
              },
              {
                icon: TrendingUp,
                title: "Higher Conversions",
                desc: "Agents who reply within 5 minutes are 9x more likely to close the deal.",
              },
            ].map((b) => (
              <div key={b.title} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)] transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-3 text-muted-foreground">Set up in minutes. Let AI do the heavy lifting.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Connect your channels",
                desc: "Link property portals, Facebook, Instagram, and your website to capture every enquiry in one place.",
              },
              {
                step: "02",
                title: "AI replies instantly",
                desc: "JobFlow AI reads each message and sends a tailored, professional reply within seconds.",
              },
              {
                step: "03",
                title: "You close the deal",
                desc: "Qualified leads appear in your dashboard. Pick up the conversation and book viewings.",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <span className="text-5xl font-bold text-primary/10">{s.step}</span>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-24 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-3 text-muted-foreground">Start free. Scale as your agency grows.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h3 className="font-semibold text-foreground">Free Trial</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">£0</span>
                <span className="text-sm text-muted-foreground">/ 14 days</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Try every feature with no commitment.</p>
              <ul className="mt-5 space-y-2.5">
                {["50 AI replies", "Unlimited leads", "Email & SMS capture", "Basic CRM"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button variant="outline" className="w-full mt-6">Start free trial</Button>
              </Link>
            </div>

            <div className="rounded-xl border-2 border-primary bg-card p-6 shadow-[var(--shadow-elegant)] relative overflow-hidden">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">Most popular</span>
                </div>
                <h3 className="font-semibold text-foreground">Starter Plan</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">£49</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Everything you need to capture and convert leads.</p>
                <ul className="mt-5 space-y-2.5">
                  {["Unlimited AI replies", "Unlimited leads", "Multi-channel capture", "Full CRM & analytics", "Team members"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button className="w-full mt-6">Get started</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Trusted by estate agents</h2>
            <p className="mt-3 text-muted-foreground">See how agencies are transforming their lead response.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Sarah Mitchell",
                role: "Director, Mitchell & Co Estate Agents",
                body: "We used to lose at least 30% of evening enquiries. Now every lead gets an instant, professional reply. Our viewing bookings are up 40%.",
              },
              {
                name: "James Crawford",
                role: "Partner, Crawford Property",
                body: "JobFlow AI qualifies buyers before they even speak to us. We walk into every call knowing budget, timeline, and what they want.",
              },
              {
                name: "Priya Sharma",
                role: "Founder, Sharma Estates",
                body: "The AI tone is spot on — professional but warm. Our clients think we have a 24-hour concierge team. Best investment we've made.",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mt-4 text-sm text-foreground leading-relaxed">"{t.body}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-xs font-semibold">
                    {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 border-t border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Ready to never miss a lead again?</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Join estate agents who are closing more deals with instant AI replies. Start your free trial today.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Start free trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Book a demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-glow">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">JobFlow AI</span>
            </div>
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} JobFlow AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard (existing, for authenticated users)                      */
/* ------------------------------------------------------------------ */

function Dashboard() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setLeads((data ?? []) as Lead[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const stats = [
    { label: "Total Leads", value: leads.length, icon: Users, iconColor: "text-primary" },
    { label: "New Today", value: leads.filter((l) => new Date(l.created_at) >= todayStart).length, icon: UserPlus, iconColor: "text-info" },
    { label: "Contacted", value: leads.filter((l) => l.status === "Contacted").length, icon: MessageSquare, iconColor: "text-info" },
    { label: "Viewing Booked", value: leads.filter((l) => l.status === "Viewing Booked").length, icon: Calendar, iconColor: "text-amber-500" },
    { label: "Closed", value: leads.filter((l) => l.status === "Closed").length, icon: CheckCircle2, iconColor: "text-emerald-500" },
  ];

  const recent = leads.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's how your pipeline is performing.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-semibold text-foreground mt-2 tracking-tight">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : s.value}
                </p>
              </div>
              <div className={`h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center ${s.iconColor}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent Leads</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest contacts captured from your channels</p>
          </div>
          <Link to="/leads" className="text-xs font-medium text-primary hover:text-primary-glow">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : recent.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No leads yet. New leads from your webhook will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Email</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">Property</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">AI</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-xs font-semibold">
                          {(l.full_name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        {l.full_name ?? "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{l.email ?? "—"}</td>
                    <td className="px-5 py-3.5 text-foreground hidden md:table-cell">{l.property_interest ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusVariant(l.status)}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {l.ai_reply ? (
                        <Badge variant="outline" className="gap-1">
                          <Sparkles className="h-3 w-3" /> Replied
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
