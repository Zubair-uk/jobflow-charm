
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free_trial',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');

-- Backfill existing orgs that may have NULL-ish values (defaults handle new rows)
UPDATE public.organizations
SET trial_ends_at = COALESCE(trial_ends_at, trial_started_at + interval '7 days')
WHERE trial_ends_at IS NULL;

-- Update org-creation trigger to set 7-day trial explicitly
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE company text;
DECLARE new_org uuid;
BEGIN
  company := NEW.raw_user_meta_data->>'company_name';
  IF company IS NOT NULL AND length(trim(company)) > 0 THEN
    INSERT INTO public.organizations (name, owner_id, plan, trial_started_at, trial_ends_at)
    VALUES (company, NEW.id, 'free_trial', now(), now() + interval '7 days')
    RETURNING id INTO new_org;
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org, NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $function$;

-- Helper: is the org's trial currently active / paid?
CREATE OR REPLACE FUNCTION public.org_has_active_access(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id
      AND (plan <> 'free_trial' OR trial_ends_at > now())
  );
$$;
