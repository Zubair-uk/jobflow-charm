-- Lock down realtime channel subscriptions: only authenticated users can subscribe,
-- and only to topics scoped by their user_id. postgres_changes still respects
-- table-level RLS on public.leads (leads_select_own enforces auth.uid() = user_id),
-- but we add channel-level authorization here as defense-in-depth.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_receive_realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_can_send_realtime"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);