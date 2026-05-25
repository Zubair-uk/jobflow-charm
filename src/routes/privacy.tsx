import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — JobFlow AI" },
      { name: "description", content: "How JobFlow AI collects, uses, and protects your personal data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="May 2026">
      <p>
        JobFlow AI ("we", "us") provides AI lead capture and auto-reply tools for estate agents.
        This Privacy Policy explains what personal data we collect, how we use it, and your rights
        under the UK GDPR and the Data Protection Act 2018.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>Account data: name, email, password hash, workspace name.</li>
        <li>Lead data you or your integrations send us: full name, email, phone, message, property interest.</li>
        <li>Usage data: pages viewed, features used, device and browser metadata.</li>
        <li>Billing data: handled by our payment processor; we never store full card numbers.</li>
      </ul>

      <h2>2. How we use your data</h2>
      <p>
        Your data is processed for lead management and AI reply automation. Specifically we use it to:
      </p>
      <ul>
        <li>Provide the dashboard, capture and store leads, and generate AI replies.</li>
        <li>Operate, secure and improve the service.</li>
        <li>Send transactional emails (sign-in, billing, important product notices).</li>
        <li>Meet our legal and accounting obligations.</li>
      </ul>

      <h2>3. Legal basis</h2>
      <p>
        We rely on (a) performance of contract to deliver the service, (b) legitimate interests to keep
        the service secure and improve it, (c) consent for any optional analytics or marketing, and
        (d) legal obligation for tax and compliance records.
      </p>

      <h2>4. Sharing</h2>
      <p>
        We share data with carefully vetted sub-processors who help us run the service (hosting,
        database, email delivery, AI model providers). We never sell your data.
      </p>

      <h2>5. Retention</h2>
      <p>
        We keep account and lead data for as long as your workspace is active. You can export or delete
        your data at any time from <strong>Settings → Data &amp; privacy</strong>. After deletion,
        backups are purged within 30 days.
      </p>

      <h2>6. Your rights</h2>
      <ul>
        <li>Access, correct or delete your personal data.</li>
        <li>Export your data in a portable format.</li>
        <li>Object to or restrict certain processing.</li>
        <li>Complain to the ICO (ico.org.uk).</li>
      </ul>

      <h2>7. Contact</h2>
      <p>For any privacy request, email <a href="mailto:privacy@jobflowai.co.uk">privacy@jobflowai.co.uk</a>.</p>
    </LegalPage>
  );
}
