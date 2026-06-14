import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Mail,
  Sheet,
  Sparkles,
  Webhook,
  Inbox,
  Copy,
  Plug,
  Loader2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  createWebhookToken,
  listWebhookTokens,
  revokeWebhookToken,
} from "@/lib/integrations.functions";
import { getGmailConnection, disconnectGmail } from "@/lib/gmail.functions";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations – JobFlow AI" },
      { name: "description", content: "Integrations for JobFlow AI." },
    ],
  }),
  component: Page,
});

function Page() {
  useAuth();
  const { orgId, isAdmin } = useOrg();

  // Gmail connection state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailChecking, setGmailChecking] = useState(true);

  const getGmailFn = useServerFn(getGmailConnection);
  const disconnectGmailFn = useServerFn(disconnectGmail);

  // Check Gmail connection status on load
  useEffect(() => {
    if (!orgId) return;

    const checkGmail = async () => {
      setGmailChecking(true);
      try {
        const res = await getGmailFn({ data: { organizationId: orgId } });
        setGmailConnected(res.connected);
        setGmailEmail(res.gmailEmail);
      } catch {
        // not connected
      } finally {
        setGmailChecking(false);
      }
    };

    void checkGmail();

    // Handle redirect back from Google OAuth
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get("gmail");
    if (gmailStatus === "connected") {
      toast.success("Gmail connected successfully!");
      // Clean up URL
      window.history.replaceState({}, "", "/integrations");
      void checkGmail();
    } else if (gmailStatus === "denied") {
      toast.error("Gmail connection was cancelled.");
      window.history.replaceState({}, "", "/integrations");
    } else if (gmailStatus === "error") {
      toast.error("Gmail connection failed. Please try again.");
      window.history.replaceState({}, "", "/integrations");
    }
  }, [orgId]);

  const handleGmailConnect = () => {
    if (!orgId) return;
    // Redirect to our OAuth start route
    window.location.href = `/api/auth/gmail/start?orgId=${orgId}`;
  };

  const handleGmailDisconnect = async () => {
    if (!orgId) return;
    setGmailLoading(true);
    try {
      await disconnectGmailFn({ data: { organizationId: orgId } });
      setGmailConnected(false);
      setGmailEmail(null);
      toast.success("Gmail disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disconnect Gmail");
    } finally {
      setGmailLoading(false);
    }
  };

  const connectedCount = [gmailConnected, true /* openai */].filter(Boolean).length;
  const totalCount = 4;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect JobFlow AI to the tools your team already uses.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Plug className="h-4 w-4 text-primary" />
          <span>
            <span className="font-medium text-foreground">{connectedCount}</span> of{" "}
            {totalCount} connected
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

        {/* Gmail — Real OAuth */}
        <Card className="group flex flex-col transition-shadow hover:shadow-[var(--shadow-elegant)]">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Mail className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-base">Gmail</CardTitle>
                <CardDescription className="text-xs">Email</CardDescription>
              </div>
            </div>
            {gmailChecking ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <StatusBadge connected={gmailConnected} />
            )}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Connect Gmail to send AI-drafted replies directly from your own email address.
              </p>
              {gmailConnected && gmailEmail && (
                <p className="text-xs font-medium text-foreground">{gmailEmail}</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">
                {gmailConnected ? "Connected via OAuth" : "Never connected"}
              </span>
              {gmailConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGmailDisconnect}
                  disabled={gmailLoading}
                >
                  {gmailLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleGmailConnect}
                  disabled={gmailChecking || !orgId}
                >
                  Connect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Microsoft Outlook — Coming Soon */}
        <Card className="group flex flex-col transition-shadow hover:shadow-[var(--shadow-elegant)]">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-info/10 text-info">
                <Inbox className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-base">Microsoft Outlook</CardTitle>
                <CardDescription className="text-xs">Email</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5 border-transparent bg-muted text-muted-foreground">
              Coming soon
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Sync inbox and send AI-drafted replies from your Outlook account.
            </p>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">Not available yet</span>
              <Button size="sm" variant="outline" disabled>
                Coming soon
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Google Sheets — Coming Soon */}
        <Card className="group flex flex-col transition-shadow hover:shadow-[var(--shadow-elegant)]">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success/10 text-success">
                <Sheet className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-base">Google Sheets</CardTitle>
                <CardDescription className="text-xs">Data</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5 border-transparent bg-muted text-muted-foreground">
              Coming soon
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Export leads and AI activity to a live spreadsheet automatically.
            </p>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">Not available yet</span>
              <Button size="sm" variant="outline" disabled>
                Coming soon
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* OpenAI — Always Connected */}
        <Card className="group flex flex-col transition-shadow hover:shadow-[var(--shadow-elegant)]">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-base">OpenAI</CardTitle>
                <CardDescription className="text-xs">AI</CardDescription>
              </div>
            </div>
            <StatusBadge connected={true} />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Powers AI replies and lead scoring with GPT-4o mini.
            </p>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">Last synced just now</span>
              <Button size="sm" variant="outline" disabled>
                Managed
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {orgId && isAdmin ? (
        <WebhookTokensCard orgId={orgId} />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Webhook className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Website webhook</CardTitle>
                <CardDescription>
                  Admins can generate ingest tokens in this workspace.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

type TokenRow = {
  id: string;
  label: string;
  source: string;
  token: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

function WebhookTokensCard({ orgId }: { orgId: string }) {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const listFn = useServerFn(listWebhookTokens);
  const createFn = useServerFn(createWebhookToken);
  const revokeFn = useServerFn(revokeWebhookToken);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await listFn({ data: { organizationId: orgId } });
      setTokens(res.tokens as TokenRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const onCreate = async () => {
    setCreating(true);
    try {
      await createFn({
        data: { organizationId: orgId, label: label.trim() || undefined },
      });
      setLabel("");
      toast.success("Webhook token created");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (tokenId: string) => {
    try {
      await revokeFn({ data: { organizationId: orgId, tokenId } });
      toast.success("Token revoked");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success/10 text-success">
            <Webhook className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <CardTitle className="text-base">Website webhook tokens (native)</CardTitle>
            <CardDescription>
              Org-scoped tokens for the JobFlow AI native ingest endpoint. Use
              these to receive leads from your website forms or any external
              source — no third-party automation tools required.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Label (e.g. Marketing site)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
          />
          <Button onClick={onCreate} disabled={creating} className="shrink-0">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Generate token
          </Button>
        </div>

        {loading && (
          <div className="text-xs text-muted-foreground">Loading tokens…</div>
        )}

        {!loading && tokens.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
            No tokens yet. Generate one to start receiving native website leads.
          </div>
        )}

        <div className="space-y-3">
          {tokens.map((t) => {
            const url = `${baseUrl}/api/public/leads/ingest?token=${t.token}`;
            const revoked = !!t.revoked_at;
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-md border border-border p-3 space-y-2",
                  revoked && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-foreground">
                      {t.label}
                      {revoked && (
                        <Badge variant="outline" className="ml-2 bg-muted text-muted-foreground">
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Created {new Date(t.created_at).toLocaleString()}
                      {t.last_used_at
                        ? ` · Last used ${new Date(t.last_used_at).toLocaleString()}`
                        : " · Never used"}
                    </div>
                  </div>
                  {!revoked && (
                    <Button size="sm" variant="outline" onClick={() => onRevoke(t.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={url} className="font-mono text-[11px]" />
                  <Button variant="outline" onClick={() => copy(url)} className="shrink-0">
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          POST JSON to the token URL. The endpoint accepts{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">full_name</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">email</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">phone</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">message</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">property_interest</code>.
          Leads are scoped to your organization automatically — no user_id required.
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-transparent",
        connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          connected ? "bg-success" : "bg-muted-foreground/60",
        )}
      />
      {connected ? "Connected" : "Disconnected"}
    </Badge>
  );
}
