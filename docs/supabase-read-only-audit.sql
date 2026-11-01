-- NIMCET.XYZ hosted Supabase read-only catalog audit
-- Run in the Supabase SQL Editor after selecting the intended project.
-- This file contains SELECT statements only. It does not alter database state.
-- Review and store the result set securely; role membership and schema details
-- can be operationally sensitive. No row contents, secrets, or password hashes
-- are selected by this audit.

-- 1. Server and current connection context
SELECT current_database() AS database_name,
       current_user AS current_role,
       session_user AS session_role,
       current_setting('server_version') AS server_version,
       current_setting('search_path') AS search_path;

-- 2. Schemas and relations (tables, views, materialized views, sequences, etc.)
SELECT n.nspname AS schema_name,
       c.relname AS relation_name,
       CASE c.relkind
         WHEN 'r' THEN 'table'
         WHEN 'p' THEN 'partitioned table'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'materialized view'
         WHEN 'f' THEN 'foreign table'
         WHEN 'S' THEN 'sequence'
         WHEN 'i' THEN 'index'
         WHEN 'I' THEN 'partitioned index'
         ELSE c.relkind::text
       END AS relation_type,
       pg_get_userbyid(c.relowner) AS owner,
       c.relpersistence AS persistence,
       c.relrowsecurity AS row_level_security_enabled,
       c.relforcerowsecurity AS row_level_security_forced,
       obj_description(c.oid, 'pg_class') AS comment
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
ORDER BY n.nspname, c.relkind, c.relname;

-- 3. Columns, SQL types, nullability, defaults, identity/generated settings
SELECT c.table_schema,
       c.table_name,
       c.ordinal_position,
       c.column_name,
       c.data_type,
       c.udt_schema,
       c.udt_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_sql_type,
       c.is_nullable,
       c.column_default,
       c.is_identity,
       c.identity_generation,
       c.is_generated,
       c.generation_expression,
       c.collation_schema,
       c.collation_name,
       col_description(cl.oid, a.attnum) AS column_comment
FROM information_schema.columns AS c
JOIN pg_catalog.pg_namespace AS ns ON ns.nspname = c.table_schema
JOIN pg_catalog.pg_class AS cl
  ON cl.relnamespace = ns.oid AND cl.relname = c.table_name
JOIN pg_catalog.pg_attribute AS a
  ON a.attrelid = cl.oid AND a.attname = c.column_name AND a.attnum > 0
WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND c.table_schema NOT LIKE 'pg_toast%'
ORDER BY c.table_schema, c.table_name, c.ordinal_position;

-- 4. User-defined types, enums, domains, and enum labels
SELECT n.nspname AS schema_name,
       t.typname AS type_name,
       CASE t.typtype
         WHEN 'e' THEN 'enum'
         WHEN 'd' THEN 'domain'
         WHEN 'c' THEN 'composite'
         WHEN 'r' THEN 'range'
         WHEN 'm' THEN 'multirange'
         ELSE t.typtype::text
       END AS type_kind,
       CASE WHEN t.typtype = 'd' THEN pg_catalog.format_type(t.typbasetype, t.typtypmod) END AS domain_base_type,
       CASE WHEN t.typtype = 'd' THEN t.typnotnull END AS domain_not_null,
       CASE WHEN t.typtype = 'd' THEN pg_get_expr(t.typdefaultbin, 0) END AS domain_default,
       e.enumsortorder AS enum_sort_order,
       e.enumlabel AS enum_label
FROM pg_catalog.pg_type AS t
JOIN pg_catalog.pg_namespace AS n ON n.oid = t.typnamespace
LEFT JOIN pg_catalog.pg_enum AS e ON e.enumtypid = t.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND t.typtype IN ('e', 'd', 'c', 'r', 'm')
ORDER BY n.nspname, t.typname, e.enumsortorder;

-- 5. Constraints, including primary, unique, check, exclusion, and foreign keys
SELECT ns.nspname AS schema_name,
       tbl.relname AS table_name,
       con.conname AS constraint_name,
       CASE con.contype
         WHEN 'p' THEN 'primary key'
         WHEN 'f' THEN 'foreign key'
         WHEN 'u' THEN 'unique'
         WHEN 'c' THEN 'check'
         WHEN 'x' THEN 'exclusion'
         WHEN 't' THEN 'constraint trigger'
         ELSE con.contype::text
       END AS constraint_type,
       pg_get_constraintdef(con.oid, true) AS definition,
       refns.nspname AS referenced_schema,
       ref.relname AS referenced_table,
       con.convalidated AS is_validated,
       con.condeferrable AS is_deferrable,
       con.condeferred AS initially_deferred,
       con.conindid::regclass::text AS supporting_index
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS tbl ON tbl.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = tbl.relnamespace
LEFT JOIN pg_catalog.pg_class AS ref ON ref.oid = con.confrelid
LEFT JOIN pg_catalog.pg_namespace AS refns ON refns.oid = ref.relnamespace
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname NOT LIKE 'pg_toast%'
ORDER BY ns.nspname, tbl.relname, con.conname;

-- 6. Index definitions and health flags
SELECT ns.nspname AS schema_name,
       tbl.relname AS table_name,
       idx.relname AS index_name,
       ix.indisprimary AS is_primary,
       ix.indisunique AS is_unique,
       ix.indisvalid AS is_valid,
       ix.indisready AS is_ready,
       ix.indislive AS is_live,
       ix.indisclustered AS is_clustered,
       pg_get_expr(ix.indpred, ix.indrelid) AS predicate,
       pg_get_indexdef(idx.oid) AS index_definition
FROM pg_catalog.pg_index AS ix
JOIN pg_catalog.pg_class AS tbl ON tbl.oid = ix.indrelid
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = tbl.relnamespace
JOIN pg_catalog.pg_class AS idx ON idx.oid = ix.indexrelid
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname NOT LIKE 'pg_toast%'
ORDER BY ns.nspname, tbl.relname, idx.relname;

-- 7. Explicit foreign-key column mappings and actions
SELECT ns.nspname AS schema_name,
       tbl.relname AS table_name,
       con.conname AS foreign_key_name,
       array_agg(srcatt.attname ORDER BY keymap.ordinality) AS local_columns,
       refns.nspname AS referenced_schema,
       ref.relname AS referenced_table,
       array_agg(refatt.attname ORDER BY keymap.ordinality) AS referenced_columns,
       CASE con.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
         WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS on_update,
       CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
         WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS on_delete,
       con.convalidated AS is_validated
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS tbl ON tbl.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = tbl.relnamespace
JOIN pg_catalog.pg_class AS ref ON ref.oid = con.confrelid
JOIN pg_catalog.pg_namespace AS refns ON refns.oid = ref.relnamespace
CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY
  AS keymap(local_attnum, referenced_attnum, ordinality)
JOIN pg_catalog.pg_attribute AS srcatt
  ON srcatt.attrelid = tbl.oid AND srcatt.attnum = keymap.local_attnum
JOIN pg_catalog.pg_attribute AS refatt
  ON refatt.attrelid = ref.oid AND refatt.attnum = keymap.referenced_attnum
WHERE con.contype = 'f'
  AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname NOT LIKE 'pg_toast%'
GROUP BY ns.nspname, tbl.relname, con.conname, refns.nspname, ref.relname,
         con.confupdtype, con.confdeltype, con.convalidated
ORDER BY ns.nspname, tbl.relname, con.conname;

-- 8. RLS state and row-level policies for relations
SELECT ns.nspname AS schema_name,
       c.relname AS relation_name,
       c.relkind AS relation_kind,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       p.policyname,
       p.permissive,
       p.roles,
       p.cmd AS command,
       p.qual AS using_expression,
       p.with_check AS check_expression
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_policies AS p
  ON p.schemaname = ns.nspname AND p.tablename = c.relname
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname NOT LIKE 'pg_toast%'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
ORDER BY ns.nspname, c.relname, p.policyname;

-- 9. Object grants: table and column privileges
SELECT 'table' AS privilege_scope,
       grantee, table_schema AS schema_name, table_name AS object_name,
       NULL::text AS column_name, privilege_type, is_grantable, grantor
FROM information_schema.table_privileges
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND table_schema NOT LIKE 'pg_toast%'
UNION ALL
SELECT 'column' AS privilege_scope,
       grantee, table_schema AS schema_name, table_name AS object_name,
       column_name, privilege_type, is_grantable, grantor
FROM information_schema.column_privileges
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND table_schema NOT LIKE 'pg_toast%'
ORDER BY schema_name, object_name, privilege_scope, grantee, column_name, privilege_type;

-- 10. Schema, sequence, and routine privileges
SELECT 'schema' AS privilege_scope, grantee, schema_name, NULL::text AS object_name,
       NULL::text AS sub_object, privilege_type, is_grantable, grantor
FROM (
  SELECT CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END AS grantee,
         ns.nspname AS schema_name,
         acl.privilege_type,
         acl.is_grantable::text AS is_grantable,
         pg_get_userbyid(acl.grantor) AS grantor
  FROM pg_catalog.pg_namespace AS ns
  CROSS JOIN LATERAL aclexplode(
    COALESCE(ns.nspacl, acldefault('n', ns.nspowner))
  ) AS acl
  WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
    AND ns.nspname NOT LIKE 'pg_toast%'
) AS schema_grants
UNION ALL
SELECT 'sequence', grantee, object_schema, object_name, NULL::text,
       privilege_type, is_grantable, grantor
FROM (
  SELECT CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END AS grantee,
         ns.nspname AS object_schema,
         c.relname AS object_name,
         acl.privilege_type,
         acl.is_grantable::text AS is_grantable,
         pg_get_userbyid(acl.grantor) AS grantor
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS ns ON ns.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(
    COALESCE(c.relacl, acldefault('S', c.relowner))
  ) AS acl
  WHERE c.relkind = 'S'
    AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
    AND ns.nspname NOT LIKE 'pg_toast%'
) AS sequence_grants
UNION ALL
SELECT 'routine', grantee, specific_schema, routine_name, specific_name,
       privilege_type, is_grantable, grantor
FROM information_schema.routine_privileges
WHERE specific_schema NOT IN ('pg_catalog', 'information_schema')
  AND specific_schema NOT LIKE 'pg_toast%'
ORDER BY schema_name, object_name, privilege_scope, grantee, privilege_type;

-- 11. Default privileges configured for future objects
SELECT ns.nspname AS schema_name,
       pg_get_userbyid(d.defaclrole) AS owner_role,
       CASE d.defaclobjtype WHEN 'r' THEN 'table' WHEN 'S' THEN 'sequence'
         WHEN 'f' THEN 'function' WHEN 'T' THEN 'type' WHEN 'n' THEN 'schema' END AS object_type,
       CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END AS grantee,
       acl.privilege_type,
       acl.is_grantable
FROM pg_catalog.pg_default_acl AS d
LEFT JOIN pg_catalog.pg_namespace AS ns ON ns.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS acl
WHERE ns.nspname IS NULL
   OR (ns.nspname NOT IN ('pg_catalog', 'information_schema')
       AND ns.nspname NOT LIKE 'pg_toast%')
ORDER BY ns.nspname NULLS FIRST, owner_role, object_type, grantee, privilege_type;

-- 12. Roles (metadata only; no password hashes or authentication secrets)
SELECT rolname AS role_name,
       rolsuper AS is_superuser,
       rolinherit AS inherits_privileges,
       rolcreaterole AS can_create_roles,
       rolcreatedb AS can_create_databases,
       rolcanlogin AS can_login,
       rolreplication AS can_replicate,
       rolbypassrls AS bypasses_rls,
       rolconnlimit AS connection_limit,
       rolvaliduntil AS valid_until
FROM pg_catalog.pg_roles
ORDER BY rolname;

-- 13. Role memberships
SELECT granted.rolname AS granted_role,
       member.rolname AS member_role,
       grantor.rolname AS grantor_role,
       am.admin_option
FROM pg_catalog.pg_auth_members AS am
JOIN pg_catalog.pg_roles AS granted ON granted.oid = am.roleid
JOIN pg_catalog.pg_roles AS member ON member.oid = am.member
JOIN pg_catalog.pg_roles AS grantor ON grantor.oid = am.grantor
ORDER BY granted.rolname, member.rolname;

-- 14. Migration-history relation presence and columns (safe if it is absent)
SELECT n.nspname AS schema_name,
       c.relname AS relation_name,
       a.attnum AS ordinal_position,
       a.attname AS column_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS sql_type
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute AS a ON a.attrelid = c.oid
WHERE n.nspname = 'supabase_migrations'
  AND c.relname = 'schema_migrations'
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;

-- 15. Migration versions/names, if Supabase's standard history table exists.
-- This returns XML so the query stays valid when that optional relation is absent.
SELECT CASE
         WHEN pg_catalog.to_regclass('supabase_migrations.schema_migrations') IS NULL
           THEN '<migration_history status="not_found" />'::xml
         ELSE query_to_xml(
           'SELECT to_jsonb(m)->>''version'' AS version, '
           'to_jsonb(m)->>''name'' AS name '
           'FROM supabase_migrations.schema_migrations AS m '
           'ORDER BY to_jsonb(m)->>''version''',
           true, false, '')
       END AS migration_history;

-- 16. Views and materialized views (definitions are omitted in this first pass)
SELECT n.nspname AS schema_name,
       c.relname AS view_name,
       CASE c.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized view' END AS view_type,
       pg_get_userbyid(c.relowner) AS owner,
       c.reloptions AS options,
       obj_description(c.oid, 'pg_class') AS comment
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE c.relkind IN ('v', 'm')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
ORDER BY n.nspname, c.relname;

-- 17. Triggers, with definitions for review
SELECT ns.nspname AS schema_name,
       tbl.relname AS table_name,
       trg.tgname AS trigger_name,
       trg.tgenabled AS enabled_state,
       trg.tgisinternal AS is_internal,
       pg_get_triggerdef(trg.oid, true) AS definition
FROM pg_catalog.pg_trigger AS trg
JOIN pg_catalog.pg_class AS tbl ON tbl.oid = trg.tgrelid
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = tbl.relnamespace
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname NOT LIKE 'pg_toast%'
ORDER BY ns.nspname, tbl.relname, trg.tgname;

-- 18. Routine metadata (source bodies are omitted)
SELECT ns.nspname AS schema_name,
       p.proname AS routine_name,
       CASE p.prokind WHEN 'f' THEN 'function' WHEN 'p' THEN 'procedure'
         WHEN 'a' THEN 'aggregate' WHEN 'w' THEN 'window function' END AS routine_kind,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       pg_get_function_result(p.oid) AS result_type,
       lang.lanname AS language,
       pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef AS security_definer,
       p.provolatile AS volatility,
       p.proleakproof AS leakproof,
       p.proconfig AS configuration
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = p.pronamespace
JOIN pg_catalog.pg_language AS lang ON lang.oid = p.prolang
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname NOT LIKE 'pg_toast%'
ORDER BY ns.nspname, p.proname, identity_arguments;

-- 19. Installed extension inventory
SELECT e.extname AS extension_name,
       e.extversion AS extension_version,
       n.nspname AS installation_schema,
       pg_get_userbyid(e.extowner) AS owner
FROM pg_catalog.pg_extension AS e
JOIN pg_catalog.pg_namespace AS n ON n.oid = e.extnamespace
ORDER BY e.extname;

-- 20. Existing questions answer-mapping summary (counts only; no prompt text)
-- Uses JSON conversion so the options SQL type can be reviewed independently.
SELECT count(*) AS row_count,
       count(DISTINCT q.id) AS distinct_ids,
       count(*) FILTER (WHERE q.status = 'published') AS published_count,
       count(*) FILTER (WHERE jsonb_typeof(j.options_json) = 'array') AS option_arrays,
       count(*) FILTER (
         WHERE CASE WHEN jsonb_typeof(j.options_json) = 'array'
                    THEN jsonb_array_length(j.options_json) = 4
                    ELSE false END
       ) AS four_option_rows,
       count(*) FILTER (
         WHERE CASE
           WHEN jsonb_typeof(j.options_json) = 'array'
            AND j.answer_text ~ '^-?[0-9]+$'
           THEN j.answer_text::numeric < 0
             OR j.answer_text::numeric >= jsonb_array_length(j.options_json)
           ELSE false
         END
       ) AS out_of_range_answers
FROM public.questions AS q
CROSS JOIN LATERAL (
  SELECT to_jsonb(q)->'options' AS options_json,
         to_jsonb(q)->>'correct_option' AS answer_text
) AS j;

-- 21. Sequence parameters and owning column for user-defined sequences
SELECT ns.nspname AS schema_name,
       seq.relname AS sequence_name,
       pg_catalog.format_type(s.seqtypid, NULL) AS sequence_type,
       s.seqstart AS start_value,
       s.seqincrement AS increment_by,
       s.seqmin AS minimum_value,
       s.seqmax AS maximum_value,
       s.seqcache AS cache_size,
       s.seqcycle AS cycles,
       tbl.relname AS owned_table,
       att.attname AS owned_column,
       dep.deptype AS ownership_dependency_type
FROM pg_catalog.pg_sequence AS s
JOIN pg_catalog.pg_class AS seq ON seq.oid = s.seqrelid
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = seq.relnamespace
LEFT JOIN pg_catalog.pg_depend AS dep
  ON dep.classid = 'pg_catalog.pg_class'::regclass
 AND dep.objid = seq.oid
 AND dep.refclassid = 'pg_catalog.pg_class'::regclass
 AND dep.deptype IN ('a', 'i')
LEFT JOIN pg_catalog.pg_class AS tbl ON tbl.oid = dep.refobjid
LEFT JOIN pg_catalog.pg_attribute AS att
  ON att.attrelid = tbl.oid AND att.attnum = dep.refobjsubid
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname NOT LIKE 'pg_toast%'
ORDER BY ns.nspname, seq.relname;
