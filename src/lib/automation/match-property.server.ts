import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Best-effort property match against an org's property list.
// Returns the matching property id (or null) without throwing — callers
// should treat a match as advisory metadata, never required.
export async function matchPropertyForOrg(
  orgId: string,
  searchHay: string,
): Promise<string | null> {
  const hay = (searchHay || "").toLowerCase();
  if (!hay) return null;

  const { data: props } = await supabaseAdmin
    .from("properties")
    .select("id, title, address, postcode, city")
    .eq("organization_id", orgId);

  if (!props || props.length === 0) return null;

  const stripSpace = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const hayNoSpace = stripSpace(hay);

  const match = props.find((p) => {
    const candidates = [p.postcode, p.title, p.address, p.city].filter(
      Boolean,
    ) as string[];
    return candidates.some((c) => {
      const cl = c.toLowerCase().trim();
      if (cl.length < 3) return false;
      if (hay.includes(cl)) return true;
      const cns = stripSpace(c);
      return cns.length >= 4 && hayNoSpace.includes(cns);
    });
  });

  return match?.id ?? null;
}