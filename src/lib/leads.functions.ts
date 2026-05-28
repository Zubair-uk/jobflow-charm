import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getLeadOrg(leadId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("leads")
    .select("organization_id")
    .eq("id", leadId)
    .maybeSingle();
  return data?.organization_id ?? null;
}

async function assertMember(userId: string, orgId: string) {
  const { data } = await supabaseAdmin
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string; status: string }) =>
    z
      .object({
        leadId: z.string().uuid(),
        status: z.enum(["New", "Contacted", "Viewing Booked", "Won", "Lost"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const orgId = await getLeadOrg(data.leadId);
    if (!orgId) throw new Error("Lead not found");
    await assertMember(context.userId, orgId);

    const { data: existing } = await supabaseAdmin
      .from("leads")
      .select("status")
      .eq("id", data.leadId)
      .maybeSingle();
    const previous = existing?.status ?? null;

    const { error } = await supabaseAdmin
      .from("leads")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.leadId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("lead_events").insert({
      organization_id: orgId,
      lead_id: data.leadId,
      actor_user_id: context.userId,
      event_type: "status_changed",
      message: previous
        ? `Status changed from ${previous} to ${data.status}`
        : `Status set to ${data.status}`,
      payload: { from: previous, to: data.status },
    });

    return { success: true };
  });

export const addLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string; note: string }) =>
    z
      .object({
        leadId: z.string().uuid(),
        note: z.string().trim().min(1).max(5000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const orgId = await getLeadOrg(data.leadId);
    if (!orgId) throw new Error("Lead not found");
    await assertMember(context.userId, orgId);

    const { error } = await supabaseAdmin.from("lead_events").insert({
      organization_id: orgId,
      lead_id: data.leadId,
      actor_user_id: context.userId,
      event_type: "note_added",
      message: data.note,
      payload: {},
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });