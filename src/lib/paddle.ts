import { resolvePaddlePrice } from "@/utils/payments.functions";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;

export async function initializePaddle() {
  if (paddleInitialized) return;
  if (!clientToken) {
    throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://cdn.paddle.com/paddle/v2/paddle.js"]',
    );
    const setup = () => {
      const paddleJsEnv =
        getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
      window.Paddle.Environment.set(paddleJsEnv);
      window.Paddle.Initialize({ token: clientToken });
      paddleInitialized = true;
      resolve();
    };
    if (existing && window.Paddle) {
      setup();
      return;
    }
    const script = existing ?? document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = setup;
    script.onerror = reject;
    if (!existing) document.head.appendChild(script);
  });
}

// Prices created directly in the Paddle dashboard (as opposed to imported
// via Paddle's Import API) have no import_meta.external_id, so they can't
// be found by the /prices?external_id= lookup below. Known raw Paddle price
// IDs are hardcoded here instead, keyed by our app-level price key and
// Paddle environment. Keep in sync with LIFETIME_PADDLE_PRICE_IDS in
// src/routes/api/public/payments/webhook.ts.
const KNOWN_PRICE_IDS: Partial<Record<string, Partial<Record<"sandbox" | "live", string>>>> = {
  lifetime: {
    live: "pri_01kzky8sre3hma43evhhk4sv8t",
    sandbox: "pri_01kznmst7n99s8021wf0k1ma5q",
  },
};

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnvironment();
  const known = KNOWN_PRICE_IDS[priceId]?.[environment];
  if (known) return known;
  return resolvePaddlePrice({ data: { priceId, environment } });
}