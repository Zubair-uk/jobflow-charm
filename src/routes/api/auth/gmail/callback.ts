import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const APIRoute = createAPIFileRoute("/api/auth/gmail/callback")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const orgId = url.searchParams.get("state"); // orgId passed via state param
    const error = url.searchParams.get("error");

    // Handle user denying access
    if (error) {
      return Response.redirect(`${url.origin}/integrations?gmail=denied`, 302);
    }

    if (!code || !orgId) {
      return Response.redirect(`${url.origin}/integrations?gmail=error`, 302);
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return Response.redirect(`${url.origin}/integrations?gmail=error`, 302);
    }

    const redirectUri = `${url.origin}/api/auth/gmail/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Gmail token exchange failed", await tokenRes.text());
      return Response.redirect(`${url.origin}/integrations?gmail=error`, 302);
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
    };

    // Get the user's Gmail address
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const profile = await profileRes.json() as { email?: string };
    const gmailEmail = profile.email ?? null;

    // Store tokens in Supabase
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: dbError } = await supabaseAdmin
      .from("gmail_connections")
      .upsert(
        {
          organization_id: orgId,
          gmail_email: gmailEmail,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          expires_at: expiresAt,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" },
      );

    if (dbError) {
      console.error("Failed to save Gmail connection", dbError);
      return Response.redirect(`${url.origin}/integrations?gmail=error`, 302);
    }

    return Response.redirect(`${url.origin}/integrations?gmail=connected`, 302);
  },
});
