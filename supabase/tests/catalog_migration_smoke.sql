-- Disposable-database smoke test for 20261101000000_create_catalog_tables.sql.
-- This test inserts fixture rows and grants temporary SELECT privileges, then
-- rolls everything back. Never run it against a production Supabase database.
-- The runner must set application_name to 'nimcet_phase3_rehearsal' first.

DO $guard$
BEGIN
    IF current_setting('application_name') <> 'nimcet_phase3_rehearsal' THEN
        RAISE EXCEPTION 'Refusing to run outside the named disposable rehearsal session';
    END IF;
    IF current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999 THEN
        RAISE EXCEPTION 'Expected PostgreSQL 17; got %', current_setting('server_version');
    END IF;
END
$guard$;

BEGIN;

DO $catalog_assertions$
DECLARE
    table_count integer;
    rls_count integer;
    policy_count integer;
    trigger_count integer;
    index_count integer;
    constraint_count integer;
    fk_count integer;
    fk_restrict_count integer;
    not_null_count integer;
    default_count integer;
    uuid_default_count integer;
    primary_count integer;
    unique_count integer;
    check_count integer;
BEGIN
    SELECT count(*) INTO table_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics');
    IF table_count <> 5 THEN RAISE EXCEPTION 'Expected 5 catalog tables; found %', table_count; END IF;

    SELECT count(*) INTO rls_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics')
      AND c.relrowsecurity AND NOT c.relforcerowsecurity;
    IF rls_count <> 5 THEN RAISE EXCEPTION 'RLS state is wrong on one or more catalog tables'; END IF;

    SELECT count(*) INTO policy_count
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('examinations', 'sections', 'subjects', 'chapters', 'topics');
    IF policy_count <> 0 THEN RAISE EXCEPTION 'The migration must not add policies'; END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(ARRAY['anon', 'authenticated']) AS client_role(role_name)
        CROSS JOIN unnest(ARRAY['examinations', 'sections', 'subjects', 'chapters', 'topics']) AS catalog_table(table_name)
        CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS privilege(privilege_name)
        WHERE has_table_privilege(
            client_role.role_name,
            format('public.%I', catalog_table.table_name),
            privilege.privilege_name
        )
    ) THEN
        RAISE EXCEPTION 'client roles have direct privileges on catalog tables';
    END IF;

    SELECT count(*) INTO trigger_count
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics')
      AND NOT t.tgisinternal;
    IF trigger_count <> 0 THEN RAISE EXCEPTION 'Catalog timestamp triggers are not expected'; END IF;

    SELECT count(*) INTO index_count
    FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class c ON c.oid = i.indrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics');
    IF index_count <> 10 THEN RAISE EXCEPTION 'Expected two necessary indexes per table; found %', index_count; END IF;

    SELECT count(*) INTO constraint_count
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics');
    IF constraint_count <> 33 THEN RAISE EXCEPTION 'Expected 33 PK/FK/unique/check constraints; found %', constraint_count; END IF;

    SELECT count(*) FILTER (WHERE con.contype = 'p'),
           count(*) FILTER (WHERE con.contype = 'u'),
           count(*) FILTER (WHERE con.contype = 'c')
      INTO primary_count, unique_count, check_count
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics');
    IF primary_count <> 5 OR unique_count <> 5 OR check_count <> 19 THEN
        RAISE EXCEPTION 'Unexpected PK/unique/check counts: %, %, %', primary_count, unique_count, check_count;
    END IF;

    SELECT count(*) INTO fk_count
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics')
      AND con.contype = 'f' AND con.convalidated;
    IF fk_count <> 4 THEN RAISE EXCEPTION 'Expected four validated catalog FKs; found %', fk_count; END IF;

    SELECT count(*) INTO fk_restrict_count
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics')
      AND con.contype = 'f' AND con.confdeltype = 'r';
    IF fk_restrict_count <> 4 THEN RAISE EXCEPTION 'Every catalog FK must use ON DELETE RESTRICT'; END IF;

    SELECT count(*) INTO not_null_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics')
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull;
    IF not_null_count <> 38 THEN RAISE EXCEPTION 'Expected 38 required columns; found %', not_null_count; END IF;

    SELECT count(*) INTO default_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics')
      AND a.attname IN ('created_at', 'updated_at');
    IF default_count <> 10 THEN RAISE EXCEPTION 'Expected insert-time timestamp defaults; found %', default_count; END IF;

    SELECT count(*) INTO uuid_default_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relname IN ('examinations', 'sections', 'subjects', 'chapters', 'topics')
      AND a.attname = 'id'
      AND pg_catalog.pg_get_expr(d.adbin, d.adrelid) LIKE '%gen_random_uuid%';
    IF uuid_default_count <> 5 THEN RAISE EXCEPTION 'Expected built-in UUID defaults on all catalog tables'; END IF;
END
$catalog_assertions$;

-- The owner ACL and role matrix are reported by the rehearsal runner before
-- these fixture-only grants. These grants exist only inside this transaction.
GRANT USAGE ON SCHEMA public TO anon, authenticated, backend_runtime, service_role;
GRANT SELECT ON public.examinations, public.sections, public.subjects, public.chapters, public.topics
    TO anon, authenticated, backend_runtime, service_role;

INSERT INTO public.examinations (code, name, status) VALUES
    ('phase3-active', 'Active exam fixture', 'active'),
    ('phase3-inactive-parent', 'Inactive exam fixture', 'inactive');

INSERT INTO public.subjects (examination_id, code, name, status)
SELECT id, 'active-child', 'Active child fixture', 'active'
FROM public.examinations WHERE code = 'phase3-inactive-parent';

INSERT INTO public.subjects (examination_id, code, name, status)
SELECT id, fixture.code, fixture.name, fixture.status
FROM public.examinations e
CROSS JOIN (VALUES
    ('phase3-active-subject', 'Active subject fixture', 'active'),
    ('phase3-inactive-subject', 'Inactive subject fixture', 'inactive')
) AS fixture(code, name, status)
WHERE e.code = 'phase3-active';

INSERT INTO public.chapters (subject_id, code, name, status)
SELECT s.id, fixture.code, fixture.name, fixture.status
FROM public.subjects s
CROSS JOIN (VALUES
    ('phase3-active-chapter', 'Active chapter fixture', 'active'),
    ('phase3-inactive-chapter', 'Inactive chapter fixture', 'inactive')
) AS fixture(code, name, status)
WHERE s.code = 'phase3-active-subject';

INSERT INTO public.chapters (subject_id, code, name, status)
SELECT s.id, 'phase3-active-chapter', 'Active chapter under inactive subject', 'active'
FROM public.subjects s WHERE s.code = 'phase3-inactive-subject';

INSERT INTO public.chapters (subject_id, code, name, status)
SELECT s.id, 'phase3-active-chapter', 'Active chapter under inactive examination', 'active'
FROM public.subjects s WHERE s.code = 'active-child';

INSERT INTO public.topics (chapter_id, code, name, status)
SELECT c.id, 'phase3-active-topic', 'Active topic fixture', 'active'
FROM public.chapters c;

INSERT INTO public.sections (examination_id, code, name, status)
SELECT id, 'inactive-section', 'Inactive section fixture', 'inactive'
FROM public.examinations WHERE code = 'phase3-active';

DO $availability_assertions$
DECLARE
    available_subjects integer;
    available_sections integer;
    available_topics integer;
    before_update timestamptz;
    after_update timestamptz;
    exam_id uuid;
BEGIN
    SELECT count(*) INTO available_subjects
    FROM public.subjects s
    JOIN public.examinations e ON e.id = s.examination_id
    WHERE e.code = 'phase3-inactive-parent'
      AND e.status = 'active' AND s.status = 'active';
    IF available_subjects <> 0 THEN RAISE EXCEPTION 'Inactive examination descendants must be unavailable'; END IF;

    SELECT count(*) INTO available_sections
    FROM public.sections s
    JOIN public.examinations e ON e.id = s.examination_id
    WHERE e.code = 'phase3-active'
      AND e.status = 'active' AND s.status = 'active';
    IF available_sections <> 0 THEN RAISE EXCEPTION 'Inactive exam sections must be unavailable'; END IF;

    SELECT count(*) INTO available_topics
    FROM public.topics t
    JOIN public.chapters c ON c.id = t.chapter_id
    JOIN public.subjects s ON s.id = c.subject_id
    JOIN public.examinations e ON e.id = s.examination_id
    WHERE t.code = 'phase3-active-topic'
      AND e.code = 'phase3-inactive-parent'
      AND e.status = 'active' AND s.status = 'active'
      AND c.status = 'active' AND t.status = 'active';
    IF available_topics <> 0 THEN RAISE EXCEPTION 'Active descendants of inactive examination must be unavailable'; END IF;

    SELECT count(*) INTO available_topics
    FROM public.topics t
    JOIN public.chapters c ON c.id = t.chapter_id
    JOIN public.subjects s ON s.id = c.subject_id
    JOIN public.examinations e ON e.id = s.examination_id
    WHERE t.code = 'phase3-active-topic'
      AND s.code = 'phase3-inactive-subject'
      AND e.status = 'active' AND s.status = 'active'
      AND c.status = 'active' AND t.status = 'active';
    IF available_topics <> 0 THEN RAISE EXCEPTION 'Active descendants of inactive subject must be unavailable'; END IF;

    SELECT count(*) INTO available_topics
    FROM public.topics t
    JOIN public.chapters c ON c.id = t.chapter_id
    JOIN public.subjects s ON s.id = c.subject_id
    JOIN public.examinations e ON e.id = s.examination_id
    WHERE t.code = 'phase3-active-topic'
      AND c.code = 'phase3-inactive-chapter'
      AND e.status = 'active' AND s.status = 'active'
      AND c.status = 'active' AND t.status = 'active';
    IF available_topics <> 0 THEN RAISE EXCEPTION 'Active descendants of inactive chapter must be unavailable'; END IF;

    SELECT count(*) INTO available_topics
    FROM public.topics t
    JOIN public.chapters c ON c.id = t.chapter_id
    JOIN public.subjects s ON s.id = c.subject_id
    JOIN public.examinations e ON e.id = s.examination_id
    WHERE t.code = 'phase3-active-topic'
      AND e.code = 'phase3-active'
      AND s.code = 'phase3-active-subject'
      AND c.code = 'phase3-active-chapter'
      AND e.status = 'active' AND s.status = 'active'
      AND c.status = 'active' AND t.status = 'active';
    IF available_topics <> 1 THEN RAISE EXCEPTION 'Fully active taxonomy path should be available; found %', available_topics; END IF;

    INSERT INTO public.examinations (code, name) VALUES ('phase3-timestamp', 'Timestamp fixture')
    RETURNING id, updated_at INTO exam_id, before_update;
    PERFORM pg_catalog.pg_sleep(0.01);
    UPDATE public.examinations
       SET name = 'Timestamp fixture changed', updated_at = pg_catalog.clock_timestamp()
     WHERE id = exam_id;
    SELECT updated_at INTO after_update FROM public.examinations WHERE id = exam_id;
    IF after_update <= before_update THEN
        RAISE EXCEPTION 'Application-style UPDATE must explicitly advance updated_at';
    END IF;
END
$availability_assertions$;

DO $constraint_behavior$
DECLARE
    active_exam_id uuid;
    active_subject_id uuid;
    active_chapter_id uuid;
BEGIN
    SELECT id INTO active_exam_id FROM public.examinations WHERE code = 'phase3-active';
    SELECT id INTO active_subject_id FROM public.subjects WHERE code = 'phase3-active-subject';
    SELECT id INTO active_chapter_id FROM public.chapters
    WHERE subject_id = active_subject_id AND code = 'phase3-active-chapter';

    BEGIN
        INSERT INTO public.examinations (code, name) VALUES ('phase3-active', 'Duplicate exam');
        RAISE EXCEPTION 'Examination code uniqueness was not enforced';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.sections (examination_id, code, name)
        VALUES (active_exam_id, 'inactive-section', 'Duplicate section');
        RAISE EXCEPTION 'Section scoped uniqueness was not enforced';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.subjects (examination_id, code, name)
        VALUES (active_exam_id, 'phase3-active-subject', 'Duplicate subject');
        RAISE EXCEPTION 'Subject scoped uniqueness was not enforced';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.chapters (subject_id, code, name)
        VALUES (active_subject_id, 'phase3-active-chapter', 'Duplicate chapter');
        RAISE EXCEPTION 'Chapter scoped uniqueness was not enforced';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.topics (chapter_id, code, name)
        VALUES (active_chapter_id, 'phase3-active-topic', 'Duplicate topic');
        RAISE EXCEPTION 'Topic scoped uniqueness was not enforced';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.subjects (examination_id, code, name)
        VALUES ('00000000-0000-0000-0000-000000000001', 'orphan', 'Orphan subject');
        RAISE EXCEPTION 'Foreign-key validation was not enforced';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        DELETE FROM public.examinations WHERE id = active_exam_id;
        RAISE EXCEPTION 'ON DELETE RESTRICT was not enforced';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.examinations (code, name) VALUES (NULL, 'Null code');
        RAISE EXCEPTION 'Examination code nullability was not enforced';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.sections (examination_id, code, name)
        VALUES (NULL, 'null-parent', 'Null parent');
        RAISE EXCEPTION 'Section parent nullability was not enforced';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
END
$constraint_behavior$;

DO $check_behavior$
DECLARE
    item record;
    statement text;
BEGIN
    FOR item IN
        SELECT * FROM (VALUES
          ('examinations', NULL::text, NULL::uuid),
          ('sections', 'examination_id', (SELECT id FROM public.examinations WHERE code = 'phase3-active')),
          ('subjects', 'examination_id', (SELECT id FROM public.examinations WHERE code = 'phase3-active')),
          ('chapters', 'subject_id', (SELECT id FROM public.subjects WHERE code = 'phase3-active-subject')),
          ('topics', 'chapter_id', (
              SELECT c.id FROM public.chapters c
              JOIN public.subjects s ON s.id = c.subject_id
              WHERE s.code = 'phase3-active-subject' AND c.code = 'phase3-active-chapter'
          ))
        ) AS catalog(table_name, parent_column, parent_id)
    LOOP
        IF item.table_name = 'examinations' THEN
            statement := 'INSERT INTO public.examinations (code,name,status) VALUES ($1,$2,$3)';
        ELSE
            statement := format(
                'INSERT INTO public.%I (%I,code,name,status,display_order) VALUES ($1,$2,$3,$4,0)',
                item.table_name, item.parent_column
            );
        END IF;

        BEGIN
            IF item.table_name = 'examinations' THEN
                EXECUTE statement USING '', 'Invalid empty code', 'active';
            ELSE
                EXECUTE statement USING item.parent_id, '', 'Invalid empty code', 'active';
            END IF;
            RAISE EXCEPTION 'Empty code check was not enforced for %', item.table_name;
        EXCEPTION WHEN check_violation THEN NULL;
        END;

        BEGIN
            IF item.table_name = 'examinations' THEN
                EXECUTE statement USING 'phase3-bad-name-' || item.table_name, '   ', 'active';
            ELSE
                EXECUTE statement USING item.parent_id, 'phase3-bad-name-' || item.table_name, '   ', 'active';
            END IF;
            RAISE EXCEPTION 'Empty name check was not enforced for %', item.table_name;
        EXCEPTION WHEN check_violation THEN NULL;
        END;

        BEGIN
            IF item.table_name = 'examinations' THEN
                EXECUTE statement USING 'phase3-bad-status-' || item.table_name, 'Invalid status', 'archived';
            ELSE
                EXECUTE statement USING item.parent_id, 'phase3-bad-status-' || item.table_name, 'Invalid status', 'archived';
            END IF;
            RAISE EXCEPTION 'Status check was not enforced for %', item.table_name;
        EXCEPTION WHEN check_violation THEN NULL;
        END;

        IF item.table_name <> 'examinations' THEN
            statement := format(
                'INSERT INTO public.%I (%I,code,name,status,display_order) VALUES ($1,$2,$3,$4,-1)',
                item.table_name, item.parent_column
            );
            BEGIN
                EXECUTE statement USING item.parent_id, 'phase3-negative-order-' || item.table_name,
                    'Negative order', 'active';
                RAISE EXCEPTION 'Display-order check was not enforced for %', item.table_name;
            EXCEPTION WHEN check_violation THEN NULL;
            END;
        END IF;
    END LOOP;
END
$check_behavior$;

SET LOCAL ROLE anon;
DO $anon_rls$
BEGIN
    IF (SELECT count(*) FROM public.examinations) <> 0 THEN
        RAISE EXCEPTION 'anon must see no catalog rows without an RLS policy';
    END IF;
END
$anon_rls$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $authenticated_rls$
BEGIN
    IF (SELECT count(*) FROM public.examinations) <> 0 THEN
        RAISE EXCEPTION 'authenticated must see no catalog rows without an RLS policy';
    END IF;
END
$authenticated_rls$;
RESET ROLE;

SET LOCAL ROLE backend_runtime;
DO $backend_rls$
BEGIN
    IF (SELECT count(*) FROM public.examinations) <> 0 THEN
        RAISE EXCEPTION 'A non-bypass backend role must see no rows without an RLS policy';
    END IF;
END
$backend_rls$;
RESET ROLE;

SET LOCAL ROLE service_role;
DO $service_bypass$
BEGIN
    IF (SELECT count(*) FROM public.examinations) <> 3 THEN
        RAISE EXCEPTION 'service_role with BYPASSRLS should see fixture rows when granted SELECT';
    END IF;
END
$service_bypass$;
RESET ROLE;

ROLLBACK;
