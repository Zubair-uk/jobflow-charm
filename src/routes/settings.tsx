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
  Download,
  FileLock2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import { useServerFn } from "@tanstack/react-start";
import {
  listTeam,
  inviteTeammate,
  updateMemberRole,
  removeMember as removeMemberFn,
  revokeInvite,
} from "@/lib/org.functions";
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

type OrgRole = "admin" | "agent" | "staff";
type TeamMemberRow = { id: string; user_id: string; email: string | null; name: string | null; role: OrgRole };
type InviteRow = { id: string; email: string; role: OrgRole; token: string; expires_at: string };

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
  const { orgId, isAdmin, role: myRole, membership } = useOrg();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [company, setCompany] = useState<CompanySettings>(defaultCompany);
  const [ai, setAI] = useState<AISettings>(defaultAI);
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [team, setTeam] = useState<TeamMemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<OrgRole>("agent");

  const fetchTeam = useServerFn(listTeam);
  const inviteFn = useServerFn(inviteTeammate);
  const updateRoleFn = useServerFn(updateMemberRole);
  const removeMemberSrv = useServerFn(removeMemberFn);
  const revokeInviteFn = useServerFn(revokeInvite);

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
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const reloadTeam = async () => {
    if (!orgId) return;
    setTeamLoading(true);
    try {
      const res = await fetchTeam({ data: { orgId } });
      setTeam(res.members);
      setInvites(res.invites as InviteRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load team");
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    void reloadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

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

  const inviteMember = async () => {
    if (!orgId) return;
    const email = newMemberEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    try {
      const invite = await inviteFn({ data: { orgId, email, role: newMemberRole } });
      const link = `${window.location.origin}/accept-invite?token=${invite.token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success("Invite created — link copied to clipboard");
      setNewMemberEmail("");
      await reloadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create invite");
    }
  };

  const changeRole = async (memberId: string, role: OrgRole) => {
    if (!orgId) return;
    try {
      await updateRoleFn({ data: { orgId, memberId, role } });
      toast.success("Role updated");
      await reloadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update role");
    }
  };

  const removeTeamMember = async (memberId: string) => {
    if (!orgId) return;
    try {
      await removeMemberSrv({ data: { orgId, memberId } });
      toast.success("Member removed");
      await reloadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove member");
    }
  };

  const cancelInvite = async (inviteId: string) => {
    if (!orgId) return;
    try {
      await revokeInviteFn({ data: { orgId, inviteId } });
      toast.success("Invite revoked");
      await reloadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke invite");
    }
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  };

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

  const handleExportData = async () => {
    if (!orgId) {
      toast.error("No workspace to export");
      return;
    }
    try {
      const [leadsRes, propsRes, repliesRes, settingsRes] = await Promise.all([
        supabase.from("leads").select("*").eq("organization_id", orgId),
        supabase.from("properties").select("*").eq("organization_id", orgId),
        supabase.from("ai_replies").select("*").eq("organization_id", orgId),
        supabase.from("settings").select("key, value, updated_at").eq("organization_id", orgId),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        organization_id: orgId,
        leads: leadsRes.data ?? [],
        properties: propsRes.data ?? [],
        ai_replies: repliesRes.data ?? [],
        settings: settingsRes.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jobflow-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export ready");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleDeleteAllData = async () => {
    if (!orgId) return;
    try {
      await Promise.all([
        supabase.from("ai_replies").delete().eq("organization_id", orgId),
        supabase.from("leads").delete().eq("organization_id", orgId),
        supabase.from("properties").delete().eq("organization_id", orgId),
      ]);
      toast.success("All workspace data deleted");
    } catch {
      toast.error("Failed to delete data");
    }
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
      <Section
        icon={<Users className="h-4 w-4" />}
        title="Team"
        description={
          membership?.organization?.name
            ? `${membership.organization.name} · Your role: ${myRole}`
            : "Invite teammates and set their access level."
        }
      >
        <div className="space-y-4">
          {isAdmin && (
            <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
              <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as OrgRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={inviteMember}>
                <Plus className="h-4 w-4" /> Invite
              </Button>
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Members</p>
            {teamLoading ? (
              <p className="text-xs text-muted-foreground py-2 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </p>
            ) : team.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No members yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {team.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-3 bg-card">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {m.name || m.email || m.user_id}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && m.user_id !== user?.id ? (
                        <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as OrgRole)}>
                          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="capitalize">{m.role}</Badge>
                      )}
                      {isAdmin && m.user_id !== user?.id && (
                        <Button variant="ghost" size="icon" onClick={() => removeTeamMember(m.id)} aria-label="Remove">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isAdmin && invites.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pending invites</p>
              <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-2 px-4 py-3 bg-card">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{inv.role}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => copyInviteLink(inv.token)}>
                        <Copy className="h-3 w-3" /> Copy link
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => cancelInvite(inv.id)} aria-label="Revoke">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
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

      {/* Data & privacy */}
      <Section
        icon={<FileLock2 className="h-4 w-4" />}
        title="Data & privacy"
        description="Your data is processed for lead management and AI reply automation only. Export or permanently delete it at any time."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4" /> Export my data
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!isAdmin} title={!isAdmin ? "Admins only" : undefined}>
                <Trash2 className="h-4 w-4" /> Delete all data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all workspace data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes all leads, properties and AI replies for this workspace.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          See our <a href="/privacy" className="text-primary underline">Privacy Policy</a> and{" "}
          <a href="/security" className="text-primary underline">Security</a> page for details.
        </p>
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
