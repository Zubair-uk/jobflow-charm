
-- ============================================================
-- 1. Extend organizations with tenant settings + billing fields
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS ai_tone text NOT NULL DEFAULT 'Professional',
  ADD COLUMN IF NOT EXISTS office_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS signature text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- ============================================================
-- 2. Plans catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  interval text NOT NULL DEFAULT 'month',
  leads_limit integer,
  ai_replies_limit integer,
  webhook_calls_limit integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  stripe_price_id text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select_all ON public.plans
  FOR SELECT USING (is_active = true);

CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default plans
INSERT INTO public.plans (code, name, price_cents, currency, leads_limit, ai_replies_limit, webhook_calls_limit, features, sort_order)
VALUES
  ('free_trial', 'Free Trial', 0, 'GBP', 50, 50, 500, '["AI lead capture","Auto replies","CRM dashboard"]'::jsonb, 0),
  ('starter', 'Starter', 9900, 'GBP', 500, 500, 5000, '["AI lead capture","Auto replies","CRM dashboard","Email automation"]'::jsonb, 1),
  ('pro', 'Pro', 29900, 'GBP', 5000, 5000, 50000, '["Everything in Starter","Multi-user accounts","Priority support"]'::jsonb, 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. Subscriptions (one active subscription per organization)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  plan_code text NOT NULL DEFAULT 'free_trial' REFERENCES public.plans(code),
  status text NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select_org ON public.subscriptions
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill subscriptions for existing organizations
INSERT INTO public.subscriptions (organization_id, plan_code, status, trial_ends_at)
SELECT o.id, COALESCE(NULLIF(o.plan, ''), 'free_trial'), 
       CASE WHEN o.plan = 'free_trial' THEN 'trialing' ELSE 'active' END,
       o.trial_ends_at
FROM public.organizations o
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================================
-- 4. Monthly usage counters
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  period_month text NOT NULL, -- format YYYY-MM
  leads_processed integer NOT NULL DEFAULT 0,
  ai_replies_generated integer NOT NULL DEFAULT 0,
  webhook_calls integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_month)
);

GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_counters_select_org ON public.usage_counters
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE TRIGGER usage_counters_set_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: atomically increment a monthly usage counter
CREATE OR REPLACE FUNCTION public.increment_usage(
  _organization_id uuid,
  _field text,
  _amount integer DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
BEGIN
  IF _field NOT IN ('leads_processed', 'ai_replies_generated', 'webhook_calls') THEN
    RAISE EXCEPTION 'Invalid usage field: %', _field;
  END IF;

  INSERT INTO public.usage_counters (organization_id, period_month)
  VALUES (_organization_id, _period)
  ON CONFLICT (organization_id, period_month) DO NOTHING;

  EXECUTE format(
    'UPDATE public.usage_counters SET %I = %I + $1, updated_at = now() WHERE organization_id = $2 AND period_month = $3',
    _field, _field
  ) USING _amount, _organization_id, _period;
END;
$$;
