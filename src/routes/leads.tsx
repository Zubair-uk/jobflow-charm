import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, Users, Sparkles, Mail, Phone, Calendar, Home, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Leads — JobFlow AI" },
      { name: "description", content: "Manage and qualify your leads." },
    ],
  }),
  component: LeadsPage,
});

export const STATUSES = ["New", "Contacted", "Viewing Booked", "Closed", "Lost"] as const;
export type Status = (typeof STATUSES)[number];

export type Lead = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  property_interest: string | null;
  lead_source: string | null;
  status: string;
  ai_reply: string | null;
  message: string | null;
  notes: string | null;
  created_at: string;
};

export function statusVariant(status: string) {
  switch (status) {
    case "Contacted":
      return "bg-info/10 text-info border-info/20";
    case "Viewing Booked":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "Closed":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "Lost":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

function LeadsPage() {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Lead | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) toast.error(error.message);
      else setLeads((data ?? []) as Lead[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user || !orgId) return;
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `organization_id=eq.${orgId}` },
        (payload) => {
          setLeads((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Lead;
              if (prev.some((l) => l.id === row.id)) return prev;
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as Lead;
              setSelected((s) => (s && s.id === row.id ? row : s));
              return prev.map((l) => (l.id === row.id ? row : l));
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as Lead;
              return prev.filter((l) => l.id !== row.id);
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, orgId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return [l.full_name, l.email, l.phone, l.property_interest, l.lead_source]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [leads, search, statusFilter]);

  const onStatusChange = async (lead: Lead, status: string) => {
    const prev = lead.status;
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    setSelected((s) => (s && s.id === lead.id ? { ...s, status } : s));
    const { error } = await supabase.from("leads").update({ status }).eq("id", lead.id);
    if (error) {
      toast.error(error.message);
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: prev } : l)));
    } else {
      toast.success("Status updated");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {leads.length} total · {filtered.length} shown
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, property…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading leads…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {leads.length === 0
                ? "Leads from your webhook will appear here."
                : "Try a different search or status."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Property</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">AI</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                    className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {lead.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{lead.email ?? "—"}</div>
                      {lead.phone && <div className="text-xs">{lead.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {lead.property_interest ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {lead.lead_source ?? "—"}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={STATUSES.includes(lead.status as Status) ? lead.status : "New"}
                        onValueChange={(v) => onStatusChange(lead, v)}
                      >
                        <SelectTrigger className={`h-8 w-[150px] border ${statusVariant(lead.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {lead.ai_reply ? (
                        <Badge variant="outline" className="gap-1">
                          <Sparkles className="h-3 w-3" /> Replied
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap hidden md:table-cell">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selected.full_name ?? "Unnamed lead"}</DialogTitle>
                <DialogDescription>
                  Captured {new Date(selected.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoRow icon={Mail} label="Email" value={selected.email} />
                  <InfoRow icon={Phone} label="Phone" value={selected.phone} />
                  <InfoRow icon={Home} label="Property interest" value={selected.property_interest} />
                  <InfoRow icon={Tag} label="Source" value={selected.lead_source} />
                  <InfoRow icon={Calendar} label="Created" value={new Date(selected.created_at).toLocaleString()} />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</label>
                  <div className="mt-1.5">
                    <Select
                      value={STATUSES.includes(selected.status as Status) ? selected.status : "New"}
                      onValueChange={(v) => onStatusChange(selected, v)}
                    >
                      <SelectTrigger className={`w-full sm:w-[200px] border ${statusVariant(selected.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Enquiry message</label>
                  <div className="mt-1.5 rounded-lg border border-border bg-muted/30 p-4 text-sm text-foreground whitespace-pre-wrap">
                    {selected.message || selected.notes || (
                      <span className="text-muted-foreground italic">No message provided</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> AI reply
                  </label>
                  <div className="mt-1.5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground whitespace-pre-wrap">
                    {selected.ai_reply || (
                      <span className="text-muted-foreground italic">No AI reply yet</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground truncate">{value || "—"}</div>
      </div>
    </div>
  );
}
