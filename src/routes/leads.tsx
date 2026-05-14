import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Pencil, Trash2, Loader2, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Leads — JobFlow AI" },
      { name: "description", content: "Manage and qualify your leads." },
    ],
  }),
  component: LeadsPage,
});

const STATUSES = ["New", "Qualified", "Follow-up", "Closed"] as const;
type Status = (typeof STATUSES)[number];

type Lead = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  property_interest: string | null;
  lead_source: string | null;
  status: string;
  ai_reply: string | null;
  created_at: string;
};

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  property_interest: "",
  lead_source: "",
  status: "New" as Status,
  ai_reply: "",
};

function statusVariant(status: string) {
  switch (status) {
    case "Qualified":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "Follow-up":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "Closed":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  // Initial fetch
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
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setLeads((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Lead;
              if (prev.some((l) => l.id === row.id)) return prev;
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as Lead;
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
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setForm({
      full_name: lead.full_name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      property_interest: lead.property_interest ?? "",
      lead_source: lead.lead_source ?? "",
      status: (STATUSES.includes(lead.status as Status) ? lead.status : "New") as Status,
      ai_reply: lead.ai_reply ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name.trim()) {
      toast.error("Name is required");
      return;
    }
    setBusy(true);
    const payload = {
      full_name: form.full_name.trim(),
      name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      property_interest: form.property_interest.trim() || null,
      property: form.property_interest.trim() || null,
      lead_source: form.lead_source.trim() || null,
      status: form.status,
      ai_reply: form.ai_reply.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("leads").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message);
      else toast.success("Lead updated");
    } else {
      const { error } = await supabase.from("leads").insert({ ...payload, user_id: user.id });
      if (error) toast.error(error.message);
      else toast.success("Lead created");
    }
    setBusy(false);
    setDialogOpen(false);
  };

  const onDelete = async (lead: Lead) => {
    if (!confirm(`Delete ${lead.full_name ?? "this lead"}?`)) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) toast.error(error.message);
    else toast.success("Lead deleted");
  };

  const onStatusChange = async (lead: Lead, status: string) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", lead.id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} total · {filtered.length} shown
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New lead
        </Button>
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
                ? "Create your first lead to get started."
                : "Try a different search or status."}
            </p>
            {leads.length === 0 && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" /> New lead
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium text-foreground">
                    {lead.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>{lead.email ?? "—"}</div>
                    {lead.phone && <div className="text-xs">{lead.phone}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.property_interest ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.lead_source ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={STATUSES.includes(lead.status as Status) ? lead.status : "New"}
                      onValueChange={(v) => onStatusChange(lead, v)}
                    >
                      <SelectTrigger className={`h-8 w-[130px] border ${statusVariant(lead.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {lead.ai_reply ? (
                      <Badge variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3" /> Replied
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(lead)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(lead)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit lead" : "New lead"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update lead details and status." : "Add a new lead to your pipeline."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="property_interest">Property interest</Label>
              <Input
                id="property_interest"
                value={form.property_interest}
                onChange={(e) => setForm({ ...form, property_interest: e.target.value })}
                placeholder="e.g. 3-bed condo, downtown"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead_source">Source</Label>
                <Input
                  id="lead_source"
                  value={form.lead_source}
                  onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                  placeholder="Website, Zillow…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as Status })}
                >
                  <SelectTrigger id="status">
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
            <div className="space-y-1.5">
              <Label htmlFor="ai_reply">AI reply</Label>
              <Textarea
                id="ai_reply"
                rows={3}
                value={form.ai_reply}
                onChange={(e) => setForm({ ...form, ai_reply: e.target.value })}
                placeholder="Latest AI-generated response…"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
