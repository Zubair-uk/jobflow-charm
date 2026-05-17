import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell, Search, LogOut } from "lucide-react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { OrgProvider, useOrg } from "@/hooks/use-org";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "JobFlow AI" },
      { name: "description", content: "AI lead capture and auto-reply platform for estate agents." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "JobFlow AI" },
      { property: "og:description", content: "AI lead capture and auto-reply platform for estate agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "JobFlow AI" },
      { name: "twitter:description", content: "AI lead capture and auto-reply platform for estate agents." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6d6503c7-5c78-4f86-b6bf-a5bbe4e66003/id-preview-e0967dec--becc696a-ae96-46e1-8c24-2694ef9c4b86.lovable.app-1778769551084.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6d6503c7-5c78-4f86-b6bf-a5bbe4e66003/id-preview-e0967dec--becc696a-ae96-46e1-8c24-2694ef9c4b86.lovable.app-1778769551084.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrgProvider>
          <AppShell />
          <Toaster />
        </OrgProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { session, loading, user, signOut } = useAuth();
  const { membership, loading: orgLoading } = useOrg();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const isPublicRoute =
    pathname === "/auth" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/accept-invite";
  const isOnboarding = pathname === "/onboarding";
  const isLanding = pathname === "/";

  useEffect(() => {
    if (!loading && !session && !isPublicRoute && !isLanding) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, isPublicRoute, isLanding, navigate]);

  useEffect(() => {
    if (loading || orgLoading || !session) return;
    if (!membership && !isOnboarding && !isPublicRoute) {
      navigate({ to: "/onboarding" });
    }
    if (membership && isOnboarding) {
      navigate({ to: "/" });
    }
  }, [loading, orgLoading, session, membership, isOnboarding, isPublicRoute, navigate]);

  if (isPublicRoute) return <Outlet />;

  if (isLanding && !session) {
    return <Outlet />;
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>;
  }

  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  if (orgLoading || !membership) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">Loading workspace…</div>;
  }

  const initials = (user?.user_metadata?.display_name || user?.email || "U")
    .split(/[\s@]/)[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between gap-4 border-b border-border bg-card/50 backdrop-blur px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden md:flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground w-72">
                <Search className="h-4 w-4" />
                <span>Search leads, replies...</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative p-2 rounded-md hover:bg-accent text-muted-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
              </button>
              <button
                onClick={() => signOut()}
                title="Sign out"
                className="p-2 rounded-md hover:bg-accent text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-xs font-semibold">
                {initials}
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
