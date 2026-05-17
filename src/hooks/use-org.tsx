import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type OrgRole = "admin" | "agent" | "staff";

export type Membership = {
  organization_id: string;
  role: OrgRole;
  organization: { id: string; name: string } | null;
};

type OrgCtx = {
  loading: boolean;
  membership: Membership | null;
  orgId: string | null;
  role: OrgRole | null;
  isAdmin: boolean;
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
      .select("organization_id, role, organization:organizations(id, name)")
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
    <Ctx.Provider
      value={{
        loading,
        membership,
        orgId: membership?.organization_id ?? null,
        role: membership?.role ?? null,
        isAdmin: membership?.role === "admin",
        refresh: load,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}