ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS past_due_since timestamptz;

CREATE OR REPLACE FUNCTION public.org_has_billing_access(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    LEFT JOIN LATERAL (
      SELECT s.*
      FROM public.subscriptions s
      WHERE s.organization_id = o.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) s ON true
    WHERE o.id = _org_id
      AND (
        -- Active or trialing paid subscription within its period
        (s.status IN ('active','trialing')
          AND (s.current_period_end IS NULL OR s.current_period_end > now()))
        OR
        -- Canceled but still within paid period (end-of-period access)
        (s.status = 'canceled'
          AND s.current_period_end IS NOT NULL
          AND s.current_period_end > now())
        OR
        -- Past due: 7-day grace window from when payment first failed
        (s.status = 'past_due'
          AND (o.past_due_since IS NULL OR o.past_due_since > now() - interval '7 days'))
        OR
        -- Free trial still running on the organization itself
        (o.plan = 'free_trial' AND o.trial_ends_at > now())
      )
  );
$function$;