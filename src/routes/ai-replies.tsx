import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ai-replies")({
  head: () => ({
    meta: [
      { title: "Ai Replies — JobFlow AI" },
      { name: "description", content: "Ai Replies for JobFlow AI." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ai Replies</h1>
      <p className="text-sm text-muted-foreground">This section is coming soon.</p>
      <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
        Ai Replies workspace
      </div>
    </div>
  );
}
