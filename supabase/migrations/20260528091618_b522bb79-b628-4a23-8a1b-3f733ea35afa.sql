
CREATE TABLE public.lead_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_events_lead ON public.lead_events(lead_id, created_at DESC);
CREATE INDEX idx_lead_events_org ON public.lead_events(organization_id, created_at DESC);

GRANT SELECT, INSERT ON public.lead_events TO authenticated;
GRANT ALL ON public.lead_events TO service_role;

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_events_select_org"
ON public.lead_events FOR SELECT
USING (organization_id IN (SELECT current_user_org_ids()));

CREATE POLICY "lead_events_insert_org"
ON public.lead_events FOR INSERT
WITH CHECK (organization_id IN (SELECT current_user_org_ids()));
