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
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — JobFlow AI" },
      { name: "description", content: "Integrations for JobFlow AI." },
    ],
  }),
  component: Page,
});

type Integration = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  connected: boolean;
  lastSynced: string | null;
};

const INITIAL: Integration[] = [
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Sync inbox and send AI-drafted replies from your Outlook account.",
    category: "Email",
    icon: Inbox,
    iconClass: "bg-info/10 text-info",
    connected: true,
    lastSynced: "2 minutes ago",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Connect Gmail to capture leads and automate responses.",
    category: "Email",
    icon: Mail,
    iconClass: "bg-destructive/10 text-destructive",
    connected: true,
    lastSynced: "12 minutes ago",
  },
  {
    id: "sheets",
    name: "Google Sheets",
    description: "Export leads and AI activity to a live spreadsheet.",
    category: "Data",
    icon: Sheet,
    iconClass: "bg-success/10 text-success",
    connected: false,
    lastSynced: null,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Power AI replies and lead scoring with your own OpenAI key.",
    category: "AI",
    icon: Sparkles,
    iconClass: "bg-primary/10 text-primary",
    connected: true,
    lastSynced: "Just now",
  },
];

function Page() {
  useAuth();
  const { orgId, isAdmin } = useOrg();
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL);

  const toggle = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              connected: !i.connected,
              lastSynced: !i.connected ? "Just now" : null,
            }
          : i,
      ),
    );
    const target = integrations.find((i) => i.id === id);
    if (target) {
      toast.success(
        target.connected ? `${target.name} disconnected` : `${target.name} connected`,
      );
    }
  };

  const connectedCount = integrations.filter((i) => i.connected).length;

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
            {integrations.length} connected
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card
              key={integration.id}
              className="group flex flex-col transition-shadow hover:shadow-[var(--shadow-elegant)]"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-lg",
                      integration.iconClass,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {integration.category}
                    </CardDescription>
                  </div>
                </div>
                <StatusBadge connected={integration.connected} />
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <p className="text-sm text-muted-foreground">{integration.description}</p>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    {integration.connected
                      ? `Last synced ${integration.lastSynced}`
                      : "Never synced"}
                  </span>
                  <Button
                    size="sm"
                    variant={integration.connected ? "outline" : "default"}
                    onClick={() => toggle(integration.id)}
                  >
                    {integration.connected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
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

function WebhookStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          tone === "success" ? "text-foreground" : "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}
