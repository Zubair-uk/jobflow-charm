import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string, orgId: string) {
  const { data, error } = await supabaseAdmin
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
}

export const listWebhookTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, data.organizationId);
    const { data: rows, error } = await supabaseAdmin
      .from("webhook_tokens")
      .select("id, label, source, token, created_at, last_used_at, revoked_at")
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tokens: rows ?? [] };
  });

export const createWebhookToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; label?: string }) =>
    z
      .object({
        organizationId: z.string().uuid(),
        label: z.string().trim().min(1).max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, data.organizationId);
    const token = randomBytes(32).toString("hex");
    const { data: row, error } = await supabaseAdmin
      .from("webhook_tokens")
      .insert({
        organization_id: data.organizationId,
        token,
        label: data.label ?? "Website",
        source: "website",
        created_by: context.userId,
      })
      .select("id, label, source, token, created_at, last_used_at, revoked_at")
      .single();
    if (error) throw new Error(error.message);
    return { token: row };
  });

export const revokeWebhookToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; tokenId: string }) =>
    z
      .object({
        organizationId: z.string().uuid(),
        tokenId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, data.organizationId);
    const { error } = await supabaseAdmin
      .from("webhook_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.tokenId)
      .eq("organization_id", data.organizationId);
    if (error) throw new Error(error.message);
    return { success: true };
  });