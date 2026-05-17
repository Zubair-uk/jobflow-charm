
CREATE OR REPLACE FUNCTION public.fill_org_id_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.organization_members
    WHERE user_id = NEW.user_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS leads_fill_org ON public.leads;
CREATE TRIGGER leads_fill_org BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fill_org_id_from_user();

DROP TRIGGER IF EXISTS ai_replies_fill_org ON public.ai_replies;
CREATE TRIGGER ai_replies_fill_org BEFORE INSERT ON public.ai_replies
  FOR EACH ROW EXECUTE FUNCTION public.fill_org_id_from_user();

DROP TRIGGER IF EXISTS settings_fill_org ON public.settings;
CREATE TRIGGER settings_fill_org BEFORE INSERT ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.fill_org_id_from_user();

DROP TRIGGER IF EXISTS integrations_fill_org ON public.integrations;
CREATE TRIGGER integrations_fill_org BEFORE INSERT ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.fill_org_id_from_user();
