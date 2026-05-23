-- Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postcode TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  price NUMERIC,
  property_type TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  viewing_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT properties_status_check CHECK (status IN ('available','unavailable','let_agreed','sold','under_offer'))
);

CREATE INDEX idx_properties_org ON public.properties(organization_id);
CREATE INDEX idx_properties_status ON public.properties(status);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select_org" ON public.properties
  FOR SELECT USING (organization_id IN (SELECT current_user_org_ids()));
CREATE POLICY "properties_insert_org" ON public.properties
  FOR INSERT WITH CHECK (organization_id IN (SELECT current_user_org_ids()));
CREATE POLICY "properties_update_org" ON public.properties
  FOR UPDATE USING (organization_id IN (SELECT current_user_org_ids()));
CREATE POLICY "properties_delete_org" ON public.properties
  FOR DELETE USING (organization_id IN (SELECT current_user_org_ids()));

CREATE TRIGGER properties_set_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link leads to properties
ALTER TABLE public.leads ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;
CREATE INDEX idx_leads_property ON public.leads(property_id);