import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";

export function usePaddleCheckout() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: {
    priceId: string;
    organizationId: string;
    successUrl?: string;
  }) => {
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: user?.email ? { email: user.email } : undefined,
        customData: {
          organizationId: options.organizationId,
          userId: user?.id ?? "",
        },
        settings: {
          displayMode: "overlay",
          successUrl:
            options.successUrl ||
            `${window.location.origin}/billing?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}