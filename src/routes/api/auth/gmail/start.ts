import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/auth/gmail/start")({
  GET: async ({ request }) => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
      return new Response("Missing GOOGLE_CLIENT_ID", { status: 500 });
    }

    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId");
    if (!orgId) {
      return new Response("Missing orgId", { status: 400 });
    }

    const redirectUri = `${url.origin}/api/auth/gmail/callback`;

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state: orgId,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return Response.redirect(googleAuthUrl, 302);
  },
});
