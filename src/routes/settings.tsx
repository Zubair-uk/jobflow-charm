import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Bot,
  Mail,
  Webhook,
  Users,
  Bell,
  Shield,
  Copy,
  Check,
  Upload,
  Loader2,
  Plus,
  Trash2,
  LogOut,
  KeyRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — JobFlow AI" },
      { name: "description", content: "Manage your workspace, AI, email, webhook and team settings." },
    ],
  }),
  component: Page,
});

type CompanySettings = {
  company_name: string;
  contact_email: string;
  phone: string;
  website: string;
  address: string;
  logo_url: string;
};

type AISettings = {
  tone: "Professional" | "Friendly" | "Luxury" | "Formal";
  auto_reply: boolean;
  response_delay: "Instant" | "1 minute" | "5 minutes";
};

type NotificationSettings = {
  email: boolean;
  browser: boolean;
  daily_summary: boolean;
};

type TeamMember = { email: string; role: "Admin" | "Agent" | "Staff" };

const defaultCompany: CompanySettings = {
  company_name: "",
  contact_email: "",
  phone: "",
  website: "",
  address: "",
  logo_url: "",
};
const defaultAI: AISettings = {
  tone: "Professional",
  auto_reply: true,
  response_delay: "Instant",
};
const defaultNotifications: NotificationSettings = {
  email: true,
  browser: false,
  daily_summary: true,
};

function Page() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [company, setCompany] = useState<CompanySettings>(defaultCompany);
  const [ai, setAI] = useState<AISettings>(defaultAI);
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<TeamMember["role"]>("Agent");

  const webhookUrl = useMemo(
    () =>
      typeof window !== "undefined"
        ? `${window.location.origin}/api/public/leads-webhook`
        : "/api/public/leads-webhook",
    [],
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("settings")
        .select("key, value")
        .eq("user_id", user.id);

      if (data) {
        for (const row of data) {
          const v = row.value as Record<string, unknown>;
          if (row.key === "company") setCompany({ ...defaultCompany, ...(v as Partial<CompanySettings>) });
          if (row.key === "ai") setAI({ ...defaultAI, ...(v as Partial<AISettings>) });
          if (row.key === "notifications")
            setNotifications({ ...defaultNotifications, ...(v as Partial<NotificationSettings>) });
          if (row.key === "team" && Array.isArray((v as { members?: TeamMember[] }).members))
            setTeam((v as { members: TeamMember[] }).members);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const saveKey = async (key: string, value: unknown) => {
    if (!user) return { error: new Error("Not signed in") };
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("user_id", user.id)
      .eq("key", key)
      .maybeSingle();

    if (existing?.id) {
      return supabase
        .from("settings")
        .update({ value: value as never, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return supabase
      .from("settings")
      .insert({ user_id: user.id, key, value: value as never });
  };

  const saveAll = async () => {
    if (!user) return;
    setSaving(true);
    const results = await Promise.all([
      saveKey("company", company),
      saveKey("ai", ai),
      saveKey("notifications", notifications),
      saveKey("team", { members: team }),
    ]);
    const err = results.find((r) => r.error);
    setSaving(false);
    if (err?.error) toast.error("Failed to save settings");
    else toast.success("Settings saved");
  };

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("company-logos")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) {
      toast.error("Logo upload failed");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
    setCompany((c) => ({ ...c, logo_url: data.publicUrl }));
    setUploading(false);
    toast.success("Logo uploaded — remember to save");
  };

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const addMember = () => {
    const email = newMemberEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    if (team.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      toast.error("That member is already added");
      return;
    }
    setTeam((t) => [...t, { email, role: newMemberRole }]);
    setNewMemberEmail("");
  };

  const removeMember = (email: string) =>
    setTeam((t) => t.filter((m) => m.email !== email));

  const handlePasswordChange = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  const handleDeleteWorkspace = async () => {
    if (!user) return;
    const { error } = await supabase.from("settings").delete().eq("user_id", user.id);
    if (error) {
      toast.error("Failed to delete workspace data");
      return;
    }
    toast.success("Workspace data cleared");
    setCompany(defaultCompany);
    setAI(defaultAI);
    setNotifications(defaultNotifications);
    setTeam([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your workspace, AI, integrations, and team.
          </p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="shrink-0">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </Button>
      </div>

      {/* Company */}
      <Section icon={<Building2 className="h-4 w-4" />} title="Company" description="Your business details shown on replies and dashboards.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company name">
            <Input
              value={company.company_name}
              onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
              placeholder="Acme Property Co."
            />
          </Field>
          <Field label="Contact email">
            <Input
              type="email"
              value={company.contact_email}
              onChange={(e) => setCompany({ ...company, contact_email: e.target.value })}
              placeholder="hello@acme.com"
            />
          </Field>
          <Field label="Phone number">
            <Input
              value={company.phone}
              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
              placeholder="+44 20 0000 0000"
            />
          </Field>
          <Field label="Website URL">
            <Input
              value={company.website}
              onChange={(e) => setCompany({ ...company, website: e.target.value })}
              placeholder="https://acme.com"
            />
          </Field>
          <Field label="Office address" className="md:col-span-2">
            <Textarea
              rows={2}
              value={company.address}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
              placeholder="123 High Street, London"
            />
          </Field>
          <Field label="Company logo" className="md:col-span-2">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                {company.logo_url ? (
                  <img src={company.logo_url} alt="Company logo" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button asChild variant="outline" disabled={uploading}>
                  <span>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {company.logo_url ? "Replace logo" : "Upload logo"}
                  </span>
                </Button>
              </label>
            </div>
          </Field>
        </div>
      </Section>

      {/* AI Reply */}
      <Section icon={<Bot className="h-4 w-4" />} title="AI replies" description="Control how your AI assistant responds to leads.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Default tone">
            <Select value={ai.tone} onValueChange={(v) => setAI({ ...ai, tone: v as AISettings["tone"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Friendly">Friendly</SelectItem>
                <SelectItem value="Luxury">Luxury</SelectItem>
                <SelectItem value="Formal">Formal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Response delay">
            <Select
              value={ai.response_delay}
              onValueChange={(v) => setAI({ ...ai, response_delay: v as AISettings["response_delay"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Instant">Instant</SelectItem>
                <SelectItem value="1 minute">1 minute</SelectItem>
                <SelectItem value="5 minutes">5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Auto reply</p>
              <p className="text-xs text-muted-foreground">Send AI replies automatically when new leads come in.</p>
            </div>
            <Switch checked={ai.auto_reply} onCheckedChange={(v) => setAI({ ...ai, auto_reply: v })} />
          </div>
        </div>
      </Section>

      {/* Email */}
      <Section icon={<Mail className="h-4 w-4" />} title="Email" description="Email account used to send replies and notifications.">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Outlook account</p>
              <p className="text-xs text-muted-foreground">{company.contact_email || "Not yet linked"}</p>
            </div>
            <Badge className="bg-success/10 text-success border-success/20" variant="outline">
              <Check className="h-3 w-3" /> Connected successfully
            </Badge>
          </div>
          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="text-sm font-medium text-foreground">SMTP / IMAP</p>
            <p className="text-xs text-muted-foreground mt-1">
              Bring your own mail server. Custom SMTP/IMAP setup is coming soon.
            </p>
          </div>
        </div>
      </Section>

      {/* Webhook */}
      <Section icon={<Webhook className="h-4 w-4" />} title="Webhook" description="POST leads to this endpoint from n8n or any external source.">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input readOnly value={webhookUrl} className="font-mono text-xs" />
            <Button variant="outline" onClick={copyWebhook} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Connected · Active
            </Badge>
            <span className="text-xs text-muted-foreground">Accepting POST requests</span>
          </div>
        </div>
      </Section>

      {/* Team */}
      <Section icon={<Users className="h-4 w-4" />} title="Team" description="Invite teammates and set their access level.">
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
            />
            <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as TeamMember["role"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Agent">Agent</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addMember}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {team.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No teammates yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {team.map((m) => (
                <li key={m.email} className="flex items-center justify-between gap-2 px-4 py-3 bg-card">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.email}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeMember(m.email)} aria-label="Remove">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={<Bell className="h-4 w-4" />} title="Notifications" description="Decide how you want to be alerted.">
        <div className="space-y-2">
          <ToggleRow
            label="Email notifications"
            description="Get notified by email when a new lead arrives."
            checked={notifications.email}
            onChange={(v) => setNotifications({ ...notifications, email: v })}
          />
          <ToggleRow
            label="Browser notifications"
            description="Show desktop alerts when you're online."
            checked={notifications.browser}
            onChange={(v) => setNotifications({ ...notifications, browser: v })}
          />
          <ToggleRow
            label="Daily summary"
            description="A morning recap of yesterday's pipeline."
            checked={notifications.daily_summary}
            onChange={(v) => setNotifications({ ...notifications, daily_summary: v })}
          />
        </div>
      </Section>

      {/* Account */}
      <Section icon={<Shield className="h-4 w-4" />} title="Account" description="Manage your access to JobFlow AI.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePasswordChange}>
            <KeyRound className="h-4 w-4" /> Change password
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" /> Delete workspace
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears all saved settings for your workspace. Leads and AI replies are kept.
                  You can't undo this.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteWorkspace}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-sm">
      <header className="mb-4 flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
