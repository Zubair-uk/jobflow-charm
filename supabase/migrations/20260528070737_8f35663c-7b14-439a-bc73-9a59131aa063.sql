DROP POLICY IF EXISTS "members_insert_self_or_admin" ON public.organization_members;

CREATE POLICY "members_insert_admin_only"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'::app_role));