import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";

// Flip to true once analytics/tracking scripts are wired in.
// Strictly necessary cookies (auth/session) are always allowed and do not require consent.
export const ANALYTICS_ENABLED = false;

const STORAGE_KEY = "jobflow.cookie-consent";

type Consent = "accepted" | "rejected";

export function getCookieConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;
    if (!getCookieConsent()) setVisible(true);
  }, []);

  if (!ANALYTICS_ENABLED || !visible) return null;

  const decide = (c: Consent) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] md:left-auto md:right-6 md:bottom-6 md:max-w-md">
      <div className="rounded-xl border border-border bg-card shadow-lg p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Cookie className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-foreground">Cookies on JobFlow AI</p>
            <p className="text-xs text-muted-foreground mt-1">
              We use strictly necessary cookies to keep you signed in. With your permission we also use
              analytics cookies to improve the product. Read our{" "}
              <Link to="/cookies" className="text-primary underline">Cookie Policy</Link>.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => decide("rejected")}>Reject</Button>
          <Button size="sm" onClick={() => decide("accepted")}>Accept</Button>
        </div>
      </div>
    </div>
  );
}
