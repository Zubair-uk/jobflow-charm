import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-footer";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — JobFlow AI" },
      { name: "description", content: "How JobFlow AI keeps your workspace and lead data secure." },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <LegalPage title="Security" updated="May 2026">
      <p>
        Security is fundamental to JobFlow AI. This page describes the technical and organisational
        measures we use to protect your data.
      </p>

      <h2>Authentication &amp; access</h2>
      <ul>
        <li>The dashboard always requires login — public access is not possible.</li>
        <li>Passwords are hashed; sessions use secure, HTTP-only cookies.</li>
        <li>Role-based access (Admin, Agent, Staff) is enforced at the database layer.</li>
      </ul>

      <h2>Workspace isolation</h2>
      <p>
        Every workspace only sees its own leads, properties, replies and settings. This is enforced
        by row-level security policies in the database, not just in the UI, so a request for another
        workspace's data is rejected at the source.
      </p>

      <h2>Data processing</h2>
      <p>
        Your data is processed for lead management and AI reply automation only. We do not sell it,
        and we do not use your lead content to train third-party models.
      </p>

      <h2>Encryption</h2>
      <ul>
        <li>All traffic is encrypted in transit with TLS 1.2+.</li>
        <li>Data is encrypted at rest on managed cloud infrastructure.</li>
        <li>Secrets and API keys are stored in a dedicated secret manager.</li>
      </ul>

      <h2>Backups &amp; reliability</h2>
      <p>
        Databases are backed up automatically. We monitor availability and respond to incidents
        around the clock.
      </p>

      <h2>Your controls</h2>
      <ul>
        <li>Export your workspace data at any time from <strong>Settings → Data &amp; privacy</strong>.</li>
        <li>Permanently delete your workspace data on the same screen.</li>
        <li>Manage who has access to your workspace from <strong>Settings → Team</strong>.</li>
      </ul>

      <h2>Reporting a vulnerability</h2>
      <p>
        If you believe you have found a security issue, please email{" "}
        <a href="mailto:security@jobflowai.co.uk">security@jobflowai.co.uk</a>. We aim to acknowledge
        reports within 2 working days.
      </p>
    </LegalPage>
  );
}
