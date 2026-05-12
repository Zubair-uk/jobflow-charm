import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — JobFlow AI" },
      { name: "description", content: "Billing for JobFlow AI." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing</h1>
      <p className="text-sm text-muted-foreground">This section is coming soon.</p>
      <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
        Billing workspace
      </div>
    </div>
  );
}
