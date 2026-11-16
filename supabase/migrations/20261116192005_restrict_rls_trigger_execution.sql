-- This internal event-trigger function is called by Postgres DDL, not students.
-- Keep the trigger and its owner unchanged; remove its public RPC privileges.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
