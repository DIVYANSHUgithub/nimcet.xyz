-- Run only against a disposable Supabase/PostgreSQL 17 database after applying
-- 20261101010000_create_trusted_roles_and_admin_audit.sql there.
-- This script is read-only and intentionally does not create fixture users.

DO $$
DECLARE
    table_name text;
    expected_roles integer;
BEGIN
    SELECT count(*) INTO expected_roles
    FROM public.roles
    WHERE code IN ('student', 'editor', 'administrator', 'super_administrator');
    IF expected_roles <> 4 THEN
        RAISE EXCEPTION 'expected four seeded roles; found %', expected_roles;
    END IF;

    FOREACH table_name IN ARRAY ARRAY['roles', 'user_roles', 'admin_audit_log'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = table_name
              AND c.relkind = 'r' AND c.relrowsecurity
        ) THEN
            RAISE EXCEPTION 'RLS is not enabled on public.%', table_name;
        END IF;

        IF EXISTS (
            SELECT 1 FROM pg_policies p
            WHERE p.schemaname = 'public' AND p.tablename = table_name
        ) THEN
            RAISE EXCEPTION 'unexpected policy exists on public.%', table_name;
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1
        FROM unnest(ARRAY['anon', 'authenticated']) AS client_role(role_name)
        CROSS JOIN unnest(ARRAY['roles', 'user_roles', 'admin_audit_log']) AS protected_table(table_name)
        WHERE has_table_privilege(client_role.role_name, format('public.%I', protected_table.table_name), 'SELECT')
           OR has_table_privilege(client_role.role_name, format('public.%I', protected_table.table_name), 'INSERT')
           OR has_table_privilege(client_role.role_name, format('public.%I', protected_table.table_name), 'UPDATE')
           OR has_table_privilege(client_role.role_name, format('public.%I', protected_table.table_name), 'DELETE')
           OR has_table_privilege(client_role.role_name, format('public.%I', protected_table.table_name), 'TRUNCATE')
           OR has_table_privilege(client_role.role_name, format('public.%I', protected_table.table_name), 'REFERENCES')
           OR has_table_privilege(client_role.role_name, format('public.%I', protected_table.table_name), 'TRIGGER')
    ) OR has_sequence_privilege('anon', 'public.roles_id_seq', 'USAGE')
      OR has_sequence_privilege('anon', 'public.roles_id_seq', 'SELECT')
      OR has_sequence_privilege('anon', 'public.roles_id_seq', 'UPDATE')
      OR has_sequence_privilege('authenticated', 'public.roles_id_seq', 'USAGE')
      OR has_sequence_privilege('authenticated', 'public.roles_id_seq', 'SELECT')
      OR has_sequence_privilege('authenticated', 'public.roles_id_seq', 'UPDATE') THEN
        RAISE EXCEPTION 'client roles have direct privileges on admin authorization tables/sequences';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'user_roles_one_active_assignment_key'
    ) THEN
        RAISE EXCEPTION 'active user-role uniqueness index is missing';
    END IF;
END $$;
