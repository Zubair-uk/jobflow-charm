import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Building2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createWorkspace } from "@/lib/org.functions";
import { useOrg } from "@/hooks/use-org";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Create your workspace — JobFlow AI" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const create = useServerFn(createWorkspace);
  const { refresh } = useOrg();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Workspace name is too short");
      return;
    }
    setBusy(true);
    try {
      await create({ data: { name: name.trim() } });
      await refresh();
      toast.success("Workspace created");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create workspace");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">JobFlow AI</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Create your workspace</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            One last step. Your team will join this workspace by invitation.
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company / workspace name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Property Co."
                required
                minLength={2}
                maxLength={100}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Create workspace
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}