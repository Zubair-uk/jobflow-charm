import { createFileRoute } from "@tanstack/react-router";
import { Users, UserPlus, Bot, Clock, ArrowUpRight, ArrowDownRight, CheckCircle2, MessageSquare, Mail, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — JobFlow AI" },
      { name: "description", content: "Track leads, AI replies, and response times in one modern dashboard." },
    ],
  }),
  component: Index,
});

const stats = [
  { label: "Total Leads", value: "12,847", delta: "+12.4%", up: true, icon: Users, tint: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { label: "New Leads Today", value: "284", delta: "+8.2%", up: true, icon: UserPlus, tint: "from-success/20 to-success/5", iconColor: "text-success" },
  { label: "AI Replies Sent", value: "9,412", delta: "+24.1%", up: true, icon: Bot, tint: "from-info/20 to-info/5", iconColor: "text-info" },
  { label: "Response Time", value: "1.4m", delta: "-32%", up: true, icon: Clock, tint: "from-warning/20 to-warning/5", iconColor: "text-warning" },
];

const leads = [
  { name: "Sarah Chen", email: "sarah.chen@gmail.com", property: "1247 Oak Ridge Dr", status: "Qualified", date: "2m ago" },
  { name: "Marcus Johnson", email: "m.johnson@outlook.com", property: "892 Maple Ave", status: "New", date: "14m ago" },
  { name: "Priya Patel", email: "priya.p@yahoo.com", property: "55 Lakeside Blvd", status: "Replied", date: "1h ago" },
  { name: "David Kim", email: "david.kim@gmail.com", property: "320 Birch Lane", status: "Qualified", date: "3h ago" },
  { name: "Elena Rossi", email: "elena.r@hotmail.com", property: "78 Sunset Way", status: "Cold", date: "5h ago" },
  { name: "James O'Connor", email: "james.o@gmail.com", property: "1100 Pine Crest", status: "New", date: "8h ago" },
];

const statusStyles: Record<string, string> = {
  Qualified: "bg-success/15 text-success",
  New: "bg-info/15 text-info",
  Replied: "bg-primary/15 text-primary",
  Cold: "bg-muted text-muted-foreground",
};

const activity = [
  { icon: Sparkles, title: "AI replied to Sarah Chen", desc: "Sent qualifying questions about budget", time: "2m ago" },
  { icon: CheckCircle2, title: "Lead qualified", desc: "Marcus Johnson moved to Qualified", time: "14m ago" },
  { icon: MessageSquare, title: "Follow-up scheduled", desc: "Priya Patel — tomorrow 10:00 AM", time: "1h ago" },
  { icon: Mail, title: "Email campaign sent", desc: "247 recipients — Spring Listings", time: "3h ago" },
  { icon: Bot, title: "AI summarized 12 threads", desc: "Saved ~45 minutes of triage", time: "6h ago" },
];

function Index() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's how your pipeline is performing today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elegant)]">
            <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${s.tint} blur-xl`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-semibold text-foreground mt-2 tracking-tight">{s.value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center ${s.iconColor}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="relative mt-4 flex items-center gap-1 text-xs">
              {s.up ? <ArrowUpRight className="h-3.5 w-3.5 text-success" /> : <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />}
              <span className={s.up ? "text-success font-medium" : "text-destructive font-medium"}>{s.delta}</span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recent Leads</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Latest contacts captured from your channels</p>
            </div>
            <button className="text-xs font-medium text-primary hover:text-primary-glow">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Property</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.email} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-xs font-semibold">
                          {l.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        {l.name}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{l.email}</td>
                    <td className="px-5 py-3.5 text-foreground">{l.property}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{l.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="text-base font-semibold text-foreground">AI Activity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Latest actions by your assistant</p>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
          </div>
          <div className="p-2">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.desc}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
