import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RoleSchema = z.enum(["admin", "agent", "staff"]);

export const createWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) =>
    z.object({ name: z.string().trim().min(2).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .insert({ name: data.name, owner_id: userId })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);

    const { error: memErr } = await supabaseAdmin
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: userId, role: "admin" });
    if (memErr) throw new Error(memErr.message);

    return { organization_id: org.id, name: org.name };
  });

async function assertAdmin(userId: string, orgId: string) {
  const { data } = await supabaseAdmin
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!data || data.role !== "admin") throw new Error("Forbidden: admin only");
}

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orgId: string }) =>
    z.object({ orgId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: mem } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", data.orgId)
      .maybeSingle();
    if (!mem) throw new Error("Forbidden");

    const { data: members } = await supabaseAdmin
      .from("organization_members")
      .select("id, user_id, role, created_at")
      .eq("organization_id", data.orgId)
      .order("created_at", { ascending: true });

    const enriched = await Promise.all(
      (members ?? []).map(async (m) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role as "admin" | "agent" | "staff",
          email: u.user?.email ?? null,
          name:
            (u.user?.user_metadata?.display_name as string | undefined) ??
            (u.user?.user_metadata?.full_name as string | undefined) ??
            null,
        };
      }),
    );

    const { data: invites } = await supabaseAdmin
      .from("organization_invites")
      .select("id, email, role, token, expires_at, accepted_at, created_at")
      .eq("organization_id", data.orgId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    return { members: enriched, invites: invites ?? [] };
  });

export const inviteTeammate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orgId: string; email: string; role: "admin" | "agent" | "staff" }) =>
    z
      .object({
        orgId: z.string().uuid(),
        email: z.string().email().max(255),
        role: RoleSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, data.orgId);

    const { data: invite, error } = await supabaseAdmin
      .from("organization_invites")
      .insert({
        organization_id: data.orgId,
        email: data.email.toLowerCase(),
        role: data.role,
        invited_by: context.userId,
      })
      .select("id, token, email, role, expires_at")
      .single();
    if (error) throw new Error(error.message);
    return invite;
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orgId: string; memberId: string; role: "admin" | "agent" | "staff" }) =>
    z
      .object({
        orgId: z.string().uuid(),
        memberId: z.string().uuid(),
        role: RoleSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, data.orgId);
    const { error } = await supabaseAdmin
      .from("organization_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("organization_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orgId: string; memberId: string }) =>
    z.object({ orgId: z.string().uuid(), memberId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, data.orgId);
    // Don't allow removing self if last admin
    const { data: target } = await supabaseAdmin
      .from("organization_members")
      .select("user_id, role")
      .eq("id", data.memberId)
      .single();
    if (target?.role === "admin") {
      const { count } = await supabaseAdmin
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", data.orgId)
        .eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("Can't remove the last admin");
    }
    const { error } = await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("id", data.memberId)
      .eq("organization_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orgId: string; inviteId: string }) =>
    z.object({ orgId: z.string().uuid(), inviteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, data.orgId);
    const { error } = await supabaseAdmin
      .from("organization_invites")
      .delete()
      .eq("id", data.inviteId)
      .eq("organization_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) =>
    z.object({ token: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: invite } = await supabaseAdmin
      .from("organization_invites")
      .select("id, organization_id, role, email, accepted_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) throw new Error("Invite not found");
    if (invite.accepted_at) throw new Error("Invite already used");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Invite expired");

    const { error: memErr } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: invite.organization_id,
        user_id: userId,
        role: invite.role,
      });
    if (memErr && !memErr.message.includes("duplicate")) throw new Error(memErr.message);

    await supabaseAdmin
      .from("organization_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return { organization_id: invite.organization_id };
  });