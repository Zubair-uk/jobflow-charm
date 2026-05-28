CREATE TABLE public.webhook_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'Website',
  source TEXT NOT NULL DEFAULT 'website',
  created_by UUID NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_tokens_org ON public.webhook_tokens(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_tokens TO authenticated;
GRANT ALL ON public.webhook_tokens TO service_role;

ALTER TABLE public.webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_tokens_select_admin" ON public.webhook_tokens
FOR SELECT TO authenticated
USING (public.has_org_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "webhook_tokens_insert_admin" ON public.webhook_tokens
FOR INSERT TO authenticated
WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "webhook_tokens_update_admin" ON public.webhook_tokens
FOR UPDATE TO authenticated
USING (public.has_org_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "webhook_tokens_delete_admin" ON public.webhook_tokens
FOR DELETE TO authenticated
USING (public.has_org_role(auth.uid(), organization_id, 'admin'::app_role));