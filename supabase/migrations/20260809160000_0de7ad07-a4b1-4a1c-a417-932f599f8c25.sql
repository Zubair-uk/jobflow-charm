-- Simplify pricing to two plans: 7-day Free Trial + one-time Lifetime.

-- 1. Retire Starter and Pro. Kept in the table (not deleted) so existing
--    subscribers' historical records and FK references stay intact; they're
--    just no longer offered to new customers.
UPDATE public.plans
SET is_active = false,
    updated_at = now()
WHERE code IN ('starter', 'pro');

-- 2. Add the Lifetime plan: one-time purchase, limits mirrored from
--    Starter's previous caps (200 leads / 200 AI replies / 2000 webhook
--    calls per month).
INSERT INTO public.plans (
  code, name, price_cents, currency, interval,
  leads_limit, ai_replies_limit, webhook_calls_limit,
  features, is_active, sort_order
)
VALUES (
  'lifetime',
  'Lifetime',
  29900,
  'GBP',
  'lifetime',
  200,
  200,
  2000,
  '["AI lead CRM","Native webhook/API ingest","AI lead extraction","AI-generated replies","Lead timeline & history","Email automation","Dashboard access","Up to 200 leads/month","Pay once, use forever"]'::jsonb,
  true,
  1
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  interval = EXCLUDED.interval,
  leads_limit = EXCLUDED.leads_limit,
  ai_replies_limit = EXCLUDED.ai_replies_limit,
  webhook_calls_limit = EXCLUDED.webhook_calls_limit,
  features = EXCLUDED.features,
  is_active = true,
  updated_at = now();

-- 3. Trial length: back to 7 days (was bumped to 14 days in
--    20260528104810_ace1903f-3413-4799-83db-258db3526365.sql).
ALTER TABLE public.organizations
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');
