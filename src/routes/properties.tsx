import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Plus, Search, Trash2, Pencil, MapPin, BedDouble, Bath, PoundSterling } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/properties")({
  head: () => ({
    meta: [
      { title: "Properties — JobFlow AI" },
      { name: "description", content: "Manage your property listings." },
    ],
  }),
  component: PropertiesPage,
});

const STATUSES = ["available", "unavailable", "let_agreed", "sold", "under_offer"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  available: "Available",
  unavailable: "Unavailable",
  let_agreed: "Let Agreed",
  sold: "Sold",
  under_offer: "Under Offer",
};

function statusVariant(s: string) {
  switch (s) {
    case "available":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "unavailable":
      return "bg-muted text-muted-foreground border-border";
    case "let_agreed":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "sold":
      return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    case "under_offer":
      return "bg-info/10 text-info border-info/20";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

type Property = {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  price: number | null;
  property_type: string | null;
  status: string;
  viewing_slots: unknown;
  description: string | null;
  created_at: string;
};

type FormState = {
  title: string;
  address: string;
  city: string;
  postcode: string;
  bedrooms: string;
  bathrooms: string;
  price: string;
  property_type: string;
  status: Status;
  viewing_slots: string;
  description: string;
};

const EMPTY: FormState = {
  title: "",
  address: "",
  city: "",
  postcode: "",
  bedrooms: "",
  bathrooms: "",
  price: "",
  property_type: "",
  status: "available",
  viewing_slots: "",
  description: "",
};

function PropertiesPage() {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Property | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) toast.error(error.message);
      else setItems((data ?? []) as Property[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !orgId) return;
    const channel = supabase
      .channel("properties-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "properties", filter: `organization_id=eq.${orgId}` },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Property;
              if (prev.some((p) => p.id === row.id)) return prev;
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as Property;
              return prev.map((p) => (p.id === row.id ? row : p));
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as Property;
              return prev.filter((p) => p.id !== row.id);
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, orgId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return [p.title, p.address, p.city, p.postcode, p.property_type]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [items, search, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (p: Property) => {
    setEditing(p);
    setForm({
      title: p.title ?? "",
      address: p.address ?? "",
      city: p.city ?? "",
      postcode: p.postcode ?? "",
      bedrooms: p.bedrooms?.toString() ?? "",
      bathrooms: p.bathrooms?.toString() ?? "",
      price: p.price?.toString() ?? "",
      property_type: p.property_type ?? "",
      status: (STATUSES.includes(p.status as Status) ? p.status : "available") as Status,
      viewing_slots: Array.isArray(p.viewing_slots) ? (p.viewing_slots as string[]).join("\n") : "",
      description: p.description ?? "",
    });
    setShowForm(true);
  };

  const onStatusChange = async (p: Property, status: string) => {
    const prev = p.status;
    setItems((arr) => arr.map((x) => (x.id === p.id ? { ...x, status } : x)));
    const { error } = await supabase.from("properties").update({ status }).eq("id", p.id);
    if (error) {
      toast.error(error.message);
      setItems((arr) => arr.map((x) => (x.id === p.id ? { ...x, status: prev } : x)));
    } else {
      toast.success("Status updated");
    }
  };

  const handleSave = async () => {
    if (!user || !orgId) return;
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const slots = form.viewing_slots
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      title: form.title.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      postcode: form.postcode.trim() || null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      price: form.price ? Number(form.price) : null,
      property_type: form.property_type.trim() || null,
      status: form.status,
      viewing_slots: slots,
      description: form.description.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("properties").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Property updated");
        setShowForm(false);
      }
    } else {
      const { error } = await supabase
        .from("properties")
        .insert({ ...payload, user_id: user.id, organization_id: orgId });
      if (error) toast.error(error.message);
      else {
        toast.success("Property added");
        setShowForm(false);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Property deleted");
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Properties</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} total · {filtered.length} shown
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add property
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, address, postcode…"
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
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading properties…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {items.length === 0 ? "No properties yet" : "No properties match your filters"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length === 0 ? "Add your first property to get started." : "Try a different search or status."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-elegant transition-shadow space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{p.title}</h3>
                  {(p.address || p.city) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {[p.address, p.city, p.postcode].filter(Boolean).join(", ")}
                      </span>
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={statusVariant(p.status)}>
                  {STATUS_LABEL[p.status as Status] ?? p.status}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {p.bedrooms != null && (
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5" /> {p.bedrooms}
                  </span>
                )}
                {p.bathrooms != null && (
                  <span className="inline-flex items-center gap-1">
                    <Bath className="h-3.5 w-3.5" /> {p.bathrooms}
                  </span>
                )}
                {p.price != null && (
                  <span className="inline-flex items-center gap-1 text-foreground font-medium">
                    <PoundSterling className="h-3.5 w-3.5" />
                    {Number(p.price).toLocaleString()}
                  </span>
                )}
                {p.property_type && (
                  <span className="text-xs uppercase tracking-wider">{p.property_type}</span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Select value={p.status} onValueChange={(v) => onStatusChange(p, v)}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(p.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit property" : "Add property"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update property details." : "Add a new property to your portfolio."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="3-bed semi-detached in Clapham"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="42 Acacia Avenue"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={form.postcode}
                onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={form.bedrooms}
                onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                value={form.bathrooms}
                onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="price">Price (£)</Label>
              <Input
                id="price"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="property_type">Property type</Label>
              <Input
                id="property_type"
                value={form.property_type}
                onChange={(e) => setForm({ ...form, property_type: e.target.value })}
                placeholder="Flat, House, Bungalow…"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as Status })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="viewing_slots">Viewing slots (one per line)</Label>
              <Textarea
                id="viewing_slots"
                value={form.viewing_slots}
                onChange={(e) => setForm({ ...form, viewing_slots: e.target.value })}
                placeholder={"Sat 24 May, 10:00\nSat 24 May, 14:00"}
                rows={3}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowForm(false)}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editing ? "Save changes" : "Add property"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete property?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this property? Linked leads will keep their record but lose
              the property link. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}