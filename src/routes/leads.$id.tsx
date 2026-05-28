import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  Home,
  Tag,
  Calendar,
  Sparkles,
  Building2,
  Loader2,
  Inbox,
  Bot,
  MessageSquare,
  GitBranch,
  StickyNote,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLeadStatus, addLeadNote } from "@/lib/leads.functions";
import { STATUSES, statusVariant, type Lead, type Status } from "./leads";

export const Route = createFileRoute("/leads/$id")({
  head: () => ({
    meta: [
      { title: "Lead details — JobFlow AI" },
      { name: "description", content: "Lead details, status pipeline and activity timeline." },
    ],
  }),
  component: LeadDetailsPage,
});

type LeadEvent = {
  id: string;
  event_type: string;
  message: string | null;
  payload: Record<string, unknown> | null;
  actor_user_id: string | null;
  created_at: string;
};

type MatchedProperty = {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  status: string;
};

function LeadDetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [matched, setMatched] = useState<MatchedProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const updateStatusFn = useServerFn(updateLeadStatus);
  const addNoteFn = useServerFn(addLeadNote);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("lead_events")
      .select("id, event_type, message, payload, actor_user_id, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false });
    setEvents((data as LeadEvent[] | null) ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      setLead((l as Lead | null) ?? null);
      if (l?.property_id) {
        const { data: p } = await supabase
          .from("properties")
          .select("id, title, address, city, postcode, status")
          .eq("id", l.property_id)
          .maybeSingle();
        if (!cancelled) setMatched((p as MatchedProperty | null) ?? null);
      }
      await loadEvents();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onStatusChange = async (status: string) => {
    if (!lead) return;
    const prev = lead.status;
    setLead({ ...lead, status });
    try {
      await updateStatusFn({ data: { leadId: lead.id, status } });
      toast.success("Status updated");
      loadEvents();
    } catch (e) {
      setLead({ ...lead, status: prev });
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    }
  };

  const onAddNote = async () => {
    const value = note.trim();
    if (!lead || !value) return;
    setSaving(true);
    try {
      await addNoteFn({ data: { leadId: lead.id, note: value } });
      setNote("");
      toast.success("Note added");
      loadEvents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading lead…
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate({ to: "/leads" })}>
          <ArrowLeft className="h-4 w-4" /> Back to leads
        </Button>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Lead not found or you don't have access.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            to="/leads"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to leads
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {lead.full_name ?? "Unnamed lead"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Captured {new Date(lead.created_at).toLocaleString()}
          </p>
        </div>
        <Select
          value={STATUSES.includes(lead.status as Status) ? lead.status : "New"}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className={`w-[200px] border ${statusVariant(lead.status)}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Contact</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <InfoRow icon={Mail} label="Email" value={lead.email} />
              <InfoRow icon={Phone} label="Phone" value={lead.phone} />
              <InfoRow icon={Home} label="Property interest" value={lead.property_interest} />
              <InfoRow icon={Tag} label="Source" value={lead.lead_source} />
              <InfoRow
                icon={Calendar}
                label="Created"
                value={new Date(lead.created_at).toLocaleString()}
              />
            </div>
          </section>

          {matched && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" /> Matched property
              </h2>
              <Link
                to="/properties"
                className="block rounded-lg border border-border bg-muted/30 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium text-foreground">{matched.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {[matched.address, matched.city, matched.postcode]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1 capitalize">
                  Status: {matched.status.replace(/_/g, " ")}
                </div>
              </Link>
            </section>
          )}

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Enquiry message</h2>
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
              {lead.message || lead.notes || (
                <span className="text-muted-foreground italic">No message provided</span>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> AI reply
            </h2>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm whitespace-pre-wrap">
              {lead.ai_reply || (
                <span className="text-muted-foreground italic">No AI reply yet</span>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <StickyNote className="h-4 w-4 text-primary" /> Add note
            </h2>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Log a call, viewing outcome, or internal note…"
            />
            <div className="flex justify-end">
              <Button onClick={onAddNote} disabled={saving || !note.trim()}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Save note
              </Button>
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Activity timeline</h2>
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-xs text-muted-foreground">
              No activity yet.
            </div>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-5">
              {events.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[26px] top-1 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card text-primary">
                    <EventIcon type={ev.event_type} />
                  </span>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-xs font-medium text-foreground">
                      {prettyEventType(ev.event_type)}
                    </div>
                    {ev.message && (
                      <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                        {ev.message}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground/70 mt-1">
                      {new Date(ev.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}

function prettyEventType(t: string) {
  switch (t) {
    case "lead_received": return "Lead received";
    case "ai_extraction_completed": return "AI extraction completed";
    case "ai_reply_generated": return "AI reply generated";
    case "status_changed": return "Status changed";
    case "note_added": return "Note added";
    default: return t.replace(/_/g, " ");
  }
}

function EventIcon({ type }: { type: string }) {
  const cls = "h-2.5 w-2.5";
  switch (type) {
    case "lead_received": return <Inbox className={cls} />;
    case "ai_extraction_completed": return <Bot className={cls} />;
    case "ai_reply_generated": return <Sparkles className={cls} />;
    case "status_changed": return <GitBranch className={cls} />;
    case "note_added": return <StickyNote className={cls} />;
    default: return <MessageSquare className={cls} />;
  }
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground break-words">{value || "—"}</div>
      </div>
    </div>
  );
}