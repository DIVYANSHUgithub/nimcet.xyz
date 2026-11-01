-- Disposable PostgreSQL 17 smoke assertions for 20261101020000_create_test_engine.sql.
-- Read-only checks only. Never run this file against production.

DO $guard$
BEGIN
    IF current_setting('application_name') <> 'nimcet_phase8_rehearsal' THEN
        RAISE EXCEPTION 'Refusing to run outside the named Phase 8 rehearsal session';
    END IF;
    IF current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999 THEN
        RAISE EXCEPTION 'Expected PostgreSQL 17; got %', current_setting('server_version');
    END IF;
END
$guard$;

DO $assertions$
DECLARE
    expected_tables text[] := ARRAY[
        'tests', 'test_versions', 'test_sections', 'test_questions', 'test_attempts',
        'attempt_questions', 'attempt_answers', 'test_submissions', 'test_results', 'section_results'
    ];
    table_name text;
    rls_count integer;
    policy_count integer;
    trigger_count integer;
BEGIN
    SELECT count(*) INTO rls_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY(expected_tables)
      AND c.relkind='r' AND c.relrowsecurity AND NOT c.relforcerowsecurity;
    IF rls_count <> cardinality(expected_tables) THEN
        RAISE EXCEPTION 'RLS is not enabled on all ten Phase 8 tables';
    END IF;

    SELECT count(*) INTO policy_count
    FROM pg_catalog.pg_policies
    WHERE schemaname='public' AND tablename=ANY(expected_tables);
    IF policy_count <> 0 THEN
        RAISE EXCEPTION 'Unexpected client RLS policies were added';
    END IF;

    SELECT count(*) INTO trigger_count
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('test_versions','test_sections','test_questions')
      AND NOT t.tgisinternal AND t.tgenabled='O';
    IF trigger_count <> 3 THEN
        RAISE EXCEPTION 'Expected three enabled immutability triggers; found %', trigger_count;
    END IF;

    FOREACH table_name IN ARRAY expected_tables LOOP
        IF has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
           OR has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
           OR has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
           OR has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
           OR has_table_privilege('anon', format('public.%I', table_name), 'TRUNCATE')
           OR has_table_privilege('anon', format('public.%I', table_name), 'REFERENCES')
           OR has_table_privilege('anon', format('public.%I', table_name), 'TRIGGER')
           OR has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
           OR has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
           OR has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
           OR has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
           OR has_table_privilege('authenticated', format('public.%I', table_name), 'TRUNCATE')
           OR has_table_privilege('authenticated', format('public.%I', table_name), 'REFERENCES')
           OR has_table_privilege('authenticated', format('public.%I', table_name), 'TRIGGER') THEN
            RAISE EXCEPTION 'Client table privilege remains on public.%', table_name;
        END IF;
    END LOOP;

    IF has_function_privilege('anon', 'public.prevent_published_test_version_change()', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.prevent_published_test_version_change()', 'EXECUTE')
       OR has_function_privilege('anon', 'public.prevent_published_test_section_change()', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.prevent_published_test_section_change()', 'EXECUTE')
       OR has_function_privilege('anon', 'public.prevent_published_test_question_change()', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.prevent_published_test_question_change()', 'EXECUTE') THEN
        RAISE EXCEPTION 'Client roles can execute an internal trigger function';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relname='test_questions' AND a.attname='question_id'
          AND a.atttypid='bigint'::regtype AND a.attnotnull
    ) THEN
        RAISE EXCEPTION 'Legacy question FK must use verified bigint type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_constraint c
        JOIN pg_catalog.pg_class r ON r.oid=c.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=r.relnamespace
        WHERE n.nspname='public' AND r.relname='test_questions'
          AND c.conname='test_questions_question_id_fkey' AND c.confdeltype='r' AND c.convalidated
    ) THEN
        RAISE EXCEPTION 'Question reference must be validated and ON DELETE RESTRICT';
    END IF;
END
$assertions$;
