import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, UserPlus, MessageSquare, Calendar, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { statusVariant, type Lead } from "./leads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — JobFlow AI" },
      { name: "description", content: "Track leads, AI replies, and pipeline status." },
    ],
  }),
  component: Index,
});

function Index() {
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
