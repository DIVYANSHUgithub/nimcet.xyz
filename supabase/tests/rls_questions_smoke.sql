-- Read-only RLS smoke check for the existing public.questions relation.
-- Run only against a local/isolated clone after importing a sanitized schema.
-- This script performs SELECTs and role changes inside a transaction, then rolls back.
-- It intentionally fails if RLS is absent or anon can see a non-published row.

begin;

do $$
declare
  questions_oid oid;
  rls_enabled boolean;
begin
  questions_oid := to_regclass('public.questions');
  if questions_oid is null then
    raise exception 'Missing expected relation public.questions';
  end if;

  select c.relrowsecurity
    into rls_enabled
    from pg_class c
   where c.oid = questions_oid;

  if not coalesce(rls_enabled, false) then
    raise exception 'RLS is not enabled on public.questions';
  end if;

  if not has_table_privilege('anon', questions_oid, 'SELECT') then
    raise exception 'anon lacks SELECT on public.questions';
  end if;
end;
$$;

set local role anon;

do $$
declare
  non_published_visible bigint;
begin
  select count(*)
    into non_published_visible
    from public.questions
   where status is distinct from 'published';

  if non_published_visible > 0 then
    raise exception 'anon can see % non-published question rows', non_published_visible;
  end if;
end;
$$;

rollback;
