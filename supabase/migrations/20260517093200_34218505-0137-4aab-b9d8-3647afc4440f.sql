
-- ============ ENUM ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'staff');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ ORGS ============
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'agent',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'agent',
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  invited_by uuid NOT NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invites_org ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.organization_invites(lower(email));

-- ============ ADD org_id TO EXISTING TABLES ============
ALTER TABLE public.leads        ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.ai_replies   ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.settings     ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS organization_id uuid;

-- ============ BACKFILL: one org per existing user ============
DO $$
DECLARE u record;
DECLARE new_org uuid;
BEGIN
  FOR u IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public.leads
      UNION SELECT user_id FROM public.ai_replies
      UNION SELECT user_id FROM public.settings
      UNION SELECT user_id FROM public.integrations
      UNION SELECT id AS user_id FROM auth.users
    ) s WHERE user_id IS NOT NULL
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.user_id = u.user_id) THEN
      INSERT INTO public.organizations (name, owner_id)
      VALUES (
        COALESCE(
          (SELECT display_name FROM public.profiles WHERE id = u.user_id),
          (SELECT split_part(email, '@', 1) FROM auth.users WHERE id = u.user_id),
          'My Workspace'
        ) || '''s Workspace',
        u.user_id
      )
      RETURNING id INTO new_org;

      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (new_org, u.user_id, 'admin');

      UPDATE public.leads        SET organization_id = new_org WHERE user_id = u.user_id AND organization_id IS NULL;
      UPDATE public.ai_replies   SET organization_id = new_org WHERE user_id = u.user_id AND organization_id IS NULL;
      UPDATE public.settings     SET organization_id = new_org WHERE user_id = u.user_id AND organization_id IS NULL;
      UPDATE public.integrations SET organization_id = new_org WHERE user_id = u.user_id AND organization_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- ============ HELPER FUNCTIONS (SECURITY DEFINER) ============
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id);
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_org_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$;

-- ============ SIGNUP TRIGGER: optional company_name in metadata ============
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE company text;
DECLARE new_org uuid;
BEGIN
  company := NEW.raw_user_meta_data->>'company_name';
  IF company IS NOT NULL AND length(trim(company)) > 0 THEN
    INSERT INTO public.organizations (name, owner_id) VALUES (company, NEW.id) RETURNING id INTO new_org;
    INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (new_org, NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();

-- ============ RLS: ORG TABLES ============
ALTER TABLE public.organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_select ON public.organizations;
CREATE POLICY org_select ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

DROP POLICY IF EXISTS org_insert_authenticated ON public.organizations;
CREATE POLICY org_insert_authenticated ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS org_update_admin ON public.organizations;
CREATE POLICY org_update_admin ON public.organizations FOR UPDATE
  USING (public.has_org_role(auth.uid(), id, 'admin'));

DROP POLICY IF EXISTS members_select ON public.organization_members;
CREATE POLICY members_select ON public.organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS members_insert_self_or_admin ON public.organization_members;
CREATE POLICY members_insert_self_or_admin ON public.organization_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_org_role(auth.uid(), organization_id, 'admin')
  );

DROP POLICY IF EXISTS members_update_admin ON public.organization_members;
CREATE POLICY members_update_admin ON public.organization_members FOR UPDATE
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));

DROP POLICY IF EXISTS members_delete_admin ON public.organization_members;
CREATE POLICY members_delete_admin ON public.organization_members FOR DELETE
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));

DROP POLICY IF EXISTS invites_select_admin ON public.organization_invites;
CREATE POLICY invites_select_admin ON public.organization_invites FOR SELECT
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));

DROP POLICY IF EXISTS invites_insert_admin ON public.organization_invites;
CREATE POLICY invites_insert_admin ON public.organization_invites FOR INSERT
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));

DROP POLICY IF EXISTS invites_update_admin ON public.organization_invites;
CREATE POLICY invites_update_admin ON public.organization_invites FOR UPDATE
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));

DROP POLICY IF EXISTS invites_delete_admin ON public.organization_invites;
CREATE POLICY invites_delete_admin ON public.organization_invites FOR DELETE
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- ============ RLS: ORG-SCOPED DATA TABLES ============
-- Drop old user_id-only policies, replace with org-scoped ones.

-- LEADS
DROP POLICY IF EXISTS leads_select_own ON public.leads;
DROP POLICY IF EXISTS leads_insert_own ON public.leads;
DROP POLICY IF EXISTS leads_update_own ON public.leads;
DROP POLICY IF EXISTS leads_delete_own ON public.leads;

CREATE POLICY leads_select_org ON public.leads FOR SELECT
  USING (organization_id IN (SELECT public.current_user_org_ids()));
CREATE POLICY leads_insert_org ON public.leads FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.current_user_org_ids()));
CREATE POLICY leads_update_org ON public.leads FOR UPDATE
  USING (organization_id IN (SELECT public.current_user_org_ids()));
CREATE POLICY leads_delete_org ON public.leads FOR DELETE
  USING (organization_id IN (SELECT public.current_user_org_ids()));

-- AI_REPLIES
DROP POLICY IF EXISTS ai_replies_select_own ON public.ai_replies;
DROP POLICY IF EXISTS ai_replies_insert_own ON public.ai_replies;
DROP POLICY IF EXISTS ai_replies_update_own ON public.ai_replies;
DROP POLICY IF EXISTS ai_replies_delete_own ON public.ai_replies;

CREATE POLICY ai_replies_select_org ON public.ai_replies FOR SELECT
  USING (organization_id IN (SELECT public.current_user_org_ids()));
CREATE POLICY ai_replies_insert_org ON public.ai_replies FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.current_user_org_ids()));
CREATE POLICY ai_replies_update_org ON public.ai_replies FOR UPDATE
  USING (organization_id IN (SELECT public.current_user_org_ids()));
CREATE POLICY ai_replies_delete_org ON public.ai_replies FOR DELETE
  USING (organization_id IN (SELECT public.current_user_org_ids()));

-- SETTINGS — admins only for write, members for read
DROP POLICY IF EXISTS settings_select_own ON public.settings;
DROP POLICY IF EXISTS settings_insert_own ON public.settings;
DROP POLICY IF EXISTS settings_update_own ON public.settings;
DROP POLICY IF EXISTS settings_delete_own ON public.settings;

CREATE POLICY settings_select_org ON public.settings FOR SELECT
  USING (organization_id IN (SELECT public.current_user_org_ids()));
CREATE POLICY settings_insert_admin ON public.settings FOR INSERT
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));
CREATE POLICY settings_update_admin ON public.settings FOR UPDATE
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));
CREATE POLICY settings_delete_admin ON public.settings FOR DELETE
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- INTEGRATIONS — admins only for write
DROP POLICY IF EXISTS integrations_select_own ON public.integrations;
DROP POLICY IF EXISTS integrations_insert_own ON public.integrations;
DROP POLICY IF EXISTS integrations_update_own ON public.integrations;
DROP POLICY IF EXISTS integrations_delete_own ON public.integrations;

CREATE POLICY integrations_select_org ON public.integrations FOR SELECT
  USING (organization_id IN (SELECT public.current_user_org_ids()));
CREATE POLICY integrations_insert_admin ON public.integrations FOR INSERT
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));
CREATE POLICY integrations_update_admin ON public.integrations FOR UPDATE
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));
CREATE POLICY integrations_delete_admin ON public.integrations FOR DELETE
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- updated_at trigger for organizations
DROP TRIGGER IF EXISTS organizations_set_updated_at ON public.organizations;
CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
