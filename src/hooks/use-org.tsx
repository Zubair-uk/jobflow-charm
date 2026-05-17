import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type OrgRole = "admin" | "agent" | "staff";

export type Membership = {
  organization_id: string;
  role: OrgRole;
  organization: {
    id: string;
    name: string;
    plan: string;
    trial_started_at: string;
    trial_ends_at: string;
  } | null;
};

type OrgCtx = {
  loading: boolean;
  membership: Membership | null;
  orgId: string | null;
  role: OrgRole | null;
  isAdmin: boolean;
  plan: string | null;
  trialEndsAt: Date | null;
  trialDaysRemaining: number | null;
  isTrialExpired: boolean;
  hasActiveAccess: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<OrgCtx | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setMembership(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("organization_members")
      .select("organization_id, role, organization:organizations(id, name, plan, trial_started_at, trial_ends_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setMembership((data as Membership | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  return (
    <Ctx.Provider value={buildValue(membership, loading, load)}>
      {children}
    </Ctx.Provider>
  );
}

function buildValue(
  membership: Membership | null,
  loading: boolean,
  refresh: () => Promise<void>,
): OrgCtx {
  const org = membership?.organization ?? null;
  const plan = org?.plan ?? null;
  const trialEndsAt = org?.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;
  const isTrialExpired = plan === "free_trial" && !!trialEndsAt && trialEndsAt.getTime() <= Date.now();
  const hasActiveAccess = plan ? plan !== "free_trial" || !isTrialExpired : true;
  return {
    loading,
    membership,
    orgId: membership?.organization_id ?? null,
    role: membership?.role ?? null,
    isAdmin: membership?.role === "admin",
    plan,
    trialEndsAt,
    trialDaysRemaining,
    isTrialExpired,
    hasActiveAccess,
    refresh,
  };
}

export function useOrg() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}