
-- 1. Update default trial length to 14 days
ALTER TABLE public.organizations
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '14 days');

-- Push existing trials forward to 14 days from trial_started_at if they were on the 7-day default
UPDATE public.organizations
SET trial_ends_at = trial_started_at + interval '14 days'
WHERE plan = 'free_trial'
  AND trial_ends_at <= trial_started_at + interval '8 days';

-- 2. Plans catalog: refresh pricing/limits
UPDATE public.plans
SET name = 'Free Trial',
    price_cents = 0,
    leads_limit = 50,
    ai_replies_limit = 50,
    webhook_calls_limit = 500,
    features = '["AI lead CRM","Native webhook/API ingest","AI lead extraction","AI-generated replies","Lead timeline","14-day trial, no credit card"]'::jsonb,
    sort_order = 0,
    is_active = true,
    updated_at = now()
WHERE code = 'free_trial';

UPDATE public.plans
SET name = 'Starter',
    price_cents = 3900,
    currency = 'GBP',
    interval = 'month',
    leads_limit = 200,
    ai_replies_limit = 200,
    webhook_calls_limit = 2000,
    features = '["AI lead CRM","Native webhook/API ingest","AI lead extraction","AI-generated replies","Lead timeline & history","Email automation","Dashboard access","Up to 200 leads/month","1 workspace admin"]'::jsonb,
    sort_order = 1,
    is_active = true,
    updated_at = now()
WHERE code = 'starter';

UPDATE public.plans
SET name = 'Pro',
    price_cents = 9900,
    currency = 'GBP',
    interval = 'month',
    leads_limit = NULL,            -- unlimited
    ai_replies_limit = NULL,
    webhook_calls_limit = NULL,
    features = '["Everything in Starter","Unlimited leads","Multiple team members","Advanced analytics","Priority support","Premium AI features"]'::jsonb,
    sort_order = 2,
    is_active = true,
    updated_at = now()
WHERE code = 'pro';

-- 3. Add Paddle columns to subscriptions (keep Stripe columns for future BYOK)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'paddle';

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle ON public.subscriptions(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_env ON public.subscriptions(organization_id, environment);

-- 4. Add Paddle identifiers to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text;

-- 5. Helper: check if an org has active paid OR trialing access (used by ingest/AI gates)
CREATE OR REPLACE FUNCTION public.org_has_billing_access(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    LEFT JOIN public.subscriptions s
      ON s.organization_id = o.id
     AND s.status IN ('active','trialing','past_due')
    WHERE o.id = _org_id
      AND (
        -- Active paid subscription
        s.id IS NOT NULL AND (s.current_period_end IS NULL OR s.current_period_end > now())
        OR
        -- Free trial still running on the organization itself
        (o.plan = 'free_trial' AND o.trial_ends_at > now())
      )
  );
$$;

-- 6. Helper: monthly usage check (returns true if within plan limit, NULL limit = unlimited)
CREATE OR REPLACE FUNCTION public.org_within_usage_limit(_org_id uuid, _field text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan_code text;
  _limit int;
  _used int;
  _period text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
BEGIN
  IF _field NOT IN ('leads_processed','ai_replies_generated','webhook_calls') THEN
    RAISE EXCEPTION 'Invalid usage field: %', _field;
  END IF;

  SELECT COALESCE(s.plan_code, o.plan, 'free_trial')
    INTO _plan_code
  FROM public.organizations o
  LEFT JOIN public.subscriptions s
    ON s.organization_id = o.id
   AND s.status IN ('active','trialing','past_due')
  WHERE o.id = _org_id
  ORDER BY s.created_at DESC NULLS LAST
  LIMIT 1;

  EXECUTE format(
    'SELECT %I FROM public.plans WHERE code = $1 LIMIT 1',
    CASE _field
      WHEN 'leads_processed' THEN 'leads_limit'
      WHEN 'ai_replies_generated' THEN 'ai_replies_limit'
      WHEN 'webhook_calls' THEN 'webhook_calls_limit'
    END
  ) INTO _limit USING _plan_code;

  IF _limit IS NULL THEN
    RETURN true; -- unlimited
  END IF;

  EXECUTE format(
    'SELECT COALESCE(%I,0) FROM public.usage_counters WHERE organization_id = $1 AND period_month = $2',
    _field
  ) INTO _used USING _org_id, _period;

  RETURN COALESCE(_used,0) < _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.org_has_billing_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_has_billing_access(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.org_within_usage_limit(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_within_usage_limit(uuid, text) TO authenticated, service_role;
