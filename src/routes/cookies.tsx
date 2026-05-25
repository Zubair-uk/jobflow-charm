import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-footer";
import { ANALYTICS_ENABLED } from "@/components/cookie-banner";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — JobFlow AI" },
      { name: "description", content: "Which cookies JobFlow AI uses and how you can control them." },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" updated="May 2026">
      <p>
        This Cookie Policy explains how JobFlow AI uses cookies and similar technologies on our website
        and in the app.
      </p>

      <h2>1. Strictly necessary cookies</h2>
      <p>
        These cookies are required to keep you signed in and to remember your workspace selection. They
        are always active and cannot be turned off, because without them the app simply will not work.
      </p>

      <h2>2. Analytics &amp; tracking cookies</h2>
      <p>
        With your consent, we may use cookies to understand how the product is used so we can improve
        it. These are optional. We only show our cookie banner when analytics or tracking cookies are
        enabled on the site.
      </p>
      <p>
        Analytics cookies are currently <strong>{ANALYTICS_ENABLED ? "enabled" : "disabled"}</strong>{" "}
        on this site. You can change your choice at any time by clearing your browser storage for this
        domain.
      </p>

      <h2>3. Accept or reject</h2>
      <p>
        Where the banner is shown, you can <strong>Accept</strong> non-essential cookies or
        <strong> Reject</strong> them. Rejecting non-essential cookies will not affect your ability to
        sign in or use the dashboard.
      </p>

      <h2>4. Third parties</h2>
      <p>
        Some sub-processors (for example our authentication and hosting providers) set their own
        strictly necessary cookies on our behalf to keep your session secure.
      </p>

      <h2>5. Contact</h2>
      <p>Questions? Email <a href="mailto:privacy@jobflowai.co.uk">privacy@jobflowai.co.uk</a>.</p>
    </LegalPage>
  );
}
