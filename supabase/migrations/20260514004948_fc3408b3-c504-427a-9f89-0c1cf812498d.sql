
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS property_interest text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_source text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_reply text;

UPDATE public.leads SET full_name = name WHERE full_name IS NULL;
UPDATE public.leads SET property_interest = property WHERE property_interest IS NULL AND property IS NOT NULL;

ALTER TABLE public.leads ALTER COLUMN name DROP NOT NULL;

ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
