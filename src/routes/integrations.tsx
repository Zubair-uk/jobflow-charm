import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  Sheet,
  Sparkles,
  Webhook,
  Inbox,
  Copy,
  Plug,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  {
    id: "n8n",
    name: "n8n Webhook",
    description: "Trigger n8n workflows whenever a new lead or reply is created.",
    category: "Automation",
    icon: Webhook,
    iconClass: "bg-warning/10 text-warning",
    connected: false,
    lastSynced: null,
  },
];

const WEBHOOK_URL = "https://api.jobflow.ai/v1/hooks/wh_8f3ad21c9e7b4f56";

function Page() {
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL);
  const [webhookActive, setWebhookActive] = useState(true);

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

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      toast.success("Webhook URL copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
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

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Webhook className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-base">Webhook settings</CardTitle>
              <CardDescription>
                Receive real-time events for new leads, replies, and status changes.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                webhookActive
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <CircleDot className="h-3 w-3" />
              {webhookActive ? "Active" : "Paused"}
            </span>
            <Switch checked={webhookActive} onCheckedChange={setWebhookActive} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url" className="text-xs uppercase tracking-wide text-muted-foreground">
              Webhook URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                readOnly
                value={WEBHOOK_URL}
                className="font-mono text-xs"
              />
              <Button variant="outline" onClick={copyWebhook} className="shrink-0">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              POST events are sent as JSON. Verify the <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">X-JobFlow-Signature</code> header before processing.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <WebhookStat label="Last delivery" value="32s ago" tone="success" />
            <WebhookStat label="Success rate (24h)" value="99.8%" tone="success" />
            <WebhookStat label="Failed (24h)" value="1" tone="warning" />
          </div>
        </CardContent>
      </Card>
    </div>
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
