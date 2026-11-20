import { PGlite } from '../.tmp/bootstrap-rehearsal/node_modules/@electric-sql/pglite/dist/index.js'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const db = new PGlite()
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const bootstrap = read('./bootstrap_approved_super_admin.sql')
const target = '7367f508-253f-4a98-a06e-0236f198296c'
const checks = []
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email_confirmed_at timestamptz);`)
  await db.exec(read('../../supabase/migrations/20261101010000_create_trusted_roles_and_admin_audit.sql'))
  await db.exec(read('../../supabase/migrations/20261115160754_add_test_manager_role.sql'))
  const counts = async () => (await db.query(`SELECT
    (SELECT count(*)::int FROM public.user_roles) AS assignments,
    (SELECT count(*)::int FROM public.admin_audit_log) AS audits`)).rows[0]
  await assert.rejects(db.exec(bootstrap), /absent or unconfirmed/)
  assert.deepEqual(await counts(), { assignments: 0, audits: 0 })
  checks.push('missing account denied')
  await db.query('INSERT INTO auth.users VALUES ($1, NULL)', [target])
  await assert.rejects(db.exec(bootstrap), /absent or unconfirmed/)
  checks.push('unconfirmed account denied')
  await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1', [target])
  await db.exec(`CREATE FUNCTION public.fail_bootstrap_audit() RETURNS trigger LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'simulated audit failure'; END; $$;
    CREATE TRIGGER rehearsal_audit_failure BEFORE INSERT ON public.admin_audit_log
    FOR EACH ROW EXECUTE FUNCTION public.fail_bootstrap_audit();`)
  await assert.rejects(db.exec(bootstrap), /simulated audit failure/)
  assert.deepEqual(await counts(), { assignments: 0, audits: 0 })
  checks.push('audit failure rolls back role assignment')
  await db.exec('DROP TRIGGER rehearsal_audit_failure ON public.admin_audit_log')
  await db.exec(bootstrap)
  assert.deepEqual(await counts(), { assignments: 1, audits: 1 })
  checks.push('role and audit commit together')
  await assert.rejects(db.exec(bootstrap), /already occurred/)
  assert.deepEqual(await counts(), { assignments: 1, audits: 1 })
  checks.push('repeat bootstrap denied')
  await db.exec('TRUNCATE public.user_roles, public.admin_audit_log')
  await db.query(`INSERT INTO public.user_roles(user_id,role_id,grant_reason)
    SELECT $1,id,'isolated fixture' FROM public.roles WHERE code='student'`, [target])
  await assert.rejects(db.exec(bootstrap), /already has an active role/)
  assert.deepEqual(await counts(), { assignments: 1, audits: 0 })
  checks.push('conflicting role denied')
  console.log(JSON.stringify({ status: 'passed', isolated: true,
    version: (await db.query('SELECT version()')).rows[0].version, checks }))
} finally {
  await db.close()
}
