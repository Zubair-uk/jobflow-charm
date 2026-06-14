import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getGmailConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("gmail_connections")
      .select("gmail_email, connected_at, expires_at")
      .eq("organization_id", data.organizationId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return {
      connected: !!row,
      gmailEmail: row?.gmail_email ?? null,
      connectedAt: row?.connected_at ?? null,
    };
  });

export const disconnectGmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("gmail_connections")
      .delete()
      .eq("organization_id", data.organizationId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export async function getFreshGmailToken(organizationId: string): Promise<string | null> {
  const { data: row, error } = await supabaseAdmin
    .from("gmail_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !row) return null;

  const expiresAt = new Date(row.expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return row.access_token;
  }

  if (!row.refresh_token) return null;

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) return null;

  const tokens = await res.json() as {
    access_token: string;
    expires_in: number;
  };

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from("gmail_connections")
    .update({ access_token: tokens.access_token, expires_at: newExpiresAt })
    .eq("organization_id", organizationId);

  return tokens.access_token;
}

export async function sendViaGmail({
  organizationId,
  to,
  subject,
  body,
}: {
  organizationId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  const accessToken = await getFreshGmailToken(organizationId);
  if (!accessToken) return false;

  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join("\r\n");

  const encoded = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  });

  return res.ok;
}
