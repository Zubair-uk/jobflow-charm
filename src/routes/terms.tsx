import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — JobFlow AI" },
      { name: "description", content: "The terms that govern your use of JobFlow AI." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="May 2026">
      <p>
        These Terms govern your use of JobFlow AI. By creating an account you agree to them.
      </p>

      <h2>1. The service</h2>
      <p>
        JobFlow AI provides lead capture, AI auto-replies and pipeline management for estate agents.
        We may update or improve the service from time to time.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must provide accurate information and keep your credentials secure.</li>
        <li>You are responsible for activity on your workspace, including teammates you invite.</li>
        <li>You must be authorised to process any lead data you upload or forward into the service.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to misuse the service. In particular you must not:</p>
      <ul>
        <li>Send spam, unsolicited marketing, or harassing messages via AI replies.</li>
        <li>Attempt to break, probe or reverse engineer the service.</li>
        <li>Upload unlawful, infringing or harmful content.</li>
      </ul>

      <h2>4. Free trial &amp; billing</h2>
      <p>
        New workspaces start on a 7-day free trial. After the trial, paid features stop until you
        upgrade. Subscriptions renew automatically and can be cancelled at any time from the Billing
        page.
      </p>

      <h2>5. Data</h2>
      <p>
        You retain ownership of your data. We process it on your behalf as described in our{" "}
        <a href="/privacy">Privacy Policy</a>. Data is processed for lead management and AI reply
        automation.
      </p>

      <h2>6. Liability</h2>
      <p>
        The service is provided "as is". To the maximum extent permitted by law our liability is
        limited to the fees you paid in the previous 12 months. We are not liable for indirect or
        consequential loss.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may close your workspace at any time. We may suspend accounts that breach these Terms.
      </p>

      <h2>8. Governing law</h2>
      <p>
        These Terms are governed by the laws of England and Wales. The courts of England and Wales
        have exclusive jurisdiction.
      </p>

      <h2>9. Contact</h2>
      <p>Questions? Email <a href="mailto:support@jobflowai.co.uk">support@jobflowai.co.uk</a>.</p>
    </LegalPage>
  );
}
