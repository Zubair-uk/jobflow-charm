import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { acceptInvite } from "@/lib/org.functions";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) ?? "" }),
  head: () => ({ meta: [{ title: "Accept invite — JobFlow AI" }] }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const accept = useServerFn(acceptInvite);
  const { session, loading: authLoading } = useAuth();
  const { refresh } = useOrg();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate({ to: "/auth" });
    }
  }, [authLoading, session, navigate]);

  const onAccept = async () => {
    if (!token) {
      toast.error("Missing invite token");
      return;
    }
    setBusy(true);
    try {
      await accept({ data: { token } });
      await refresh();
      setDone(true);
      toast.success("Welcome to the team");
      setTimeout(() => navigate({ to: "/" }), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">JobFlow AI</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">You've been invited</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Click below to join the workspace.
          </p>
          <Button onClick={onAccept} disabled={busy || done || !session} className="w-full mt-5">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {done ? "Joined!" : "Accept invite"}
          </Button>
        </div>
      </div>
    </div>
  );
}