"""One-time operator setup for the server-only database login.

Uses the current ignored backend .env operator connection, creates a fresh role,
verifies its permissions, then replaces DATABASE_URL. Refuses an existing role.
Application authorization and student ownership checks remain in FastAPI.
No browser/API role inherits this login. No default privileges are changed.
"""
import json
import re
import secrets
from pathlib import Path

import psycopg
from psycopg import sql
from sqlalchemy.engine import make_url

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import get_settings

ROLE = 'nimcet_backend'
# Only operations currently used by backend/app/db repositories.
ACCESS = {
    'questions': ('SELECT',),
    'roles': ('SELECT',),
    'user_roles': ('SELECT', 'INSERT', 'UPDATE'),
    'admin_audit_log': ('SELECT', 'INSERT'),
    'tests': ('SELECT', 'INSERT', 'UPDATE'),
    'test_versions': ('SELECT', 'INSERT', 'UPDATE'),
    'test_sections': ('SELECT', 'INSERT'),
    'test_questions': ('SELECT', 'INSERT'),
    'test_attempts': ('SELECT', 'INSERT', 'UPDATE'),
    'attempt_questions': ('SELECT', 'INSERT', 'UPDATE'),
    'attempt_answers': ('SELECT', 'INSERT', 'UPDATE'),
    'test_submissions': ('SELECT', 'INSERT'),
    'test_results': ('SELECT', 'INSERT'),
    'section_results': ('SELECT', 'INSERT'),
}


def connect(url):
    return psycopg.connect(
        host=url.host, port=url.port or 5432, dbname=url.database,
        user=url.username, password=url.password, **dict(url.query),
        connect_timeout=10, options='-c statement_timeout=10000 -c lock_timeout=3000',
    )


def main():
    env_path = Path('.env')
    original = env_path.read_text(encoding='utf-8')
    operator = make_url(get_settings().database_url.get_secret_value())
    assert operator.host == 'aws-0-ap-south-1.pooler.supabase.com'
    assert operator.username == 'postgres.wcxxyyebcgofziylgwdg'
    assert operator.query.get('sslmode') == 'verify-full'
    assert len(re.findall(r'^\s*DATABASE_URL\s*=.*$', original, re.M)) == 1
    password = secrets.token_urlsafe(48)
    role = sql.Identifier(ROLE)
    runtime = operator.set(username=ROLE+'.wcxxyyebcgofziylgwdg', password=password)
    pending = Path('.env.runtime.pending')
    assert not pending.exists(), 'Pending credentials exist; inspect prior setup first.'
    with connect(operator) as c:
        assert c.pgconn.ssl_in_use
        with c.cursor() as cur:
            cur.execute('SELECT current_user')
            assert cur.fetchone()[0] == 'postgres'
            cur.execute('SELECT 1 FROM pg_roles WHERE rolname=%s', (ROLE,))
            assert cur.fetchone() is None, 'Role already exists; refusing to rotate it.'
            for table in ACCESS:
                cur.execute("SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass(%s)", ('public.'+table,))
                assert cur.fetchone() == (True,), 'Expected RLS table missing: '+table
            cur.execute(sql.SQL('CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 12').format(role, sql.Literal(password)))
            cur.execute(sql.SQL('GRANT CONNECT ON DATABASE {} TO {}').format(sql.Identifier(operator.database), role))
            cur.execute(sql.SQL('GRANT USAGE ON SCHEMA public TO {}').format(role))
            for table, operations in ACCESS.items():
                target = sql.Identifier('public', table)
                cur.execute(sql.SQL('GRANT {} ON TABLE {} TO {}').format(sql.SQL(', ').join(map(sql.SQL, operations)), target, role))
                for operation in operations:
                    expression = 'WITH CHECK (true)' if operation == 'INSERT' else 'USING (true) WITH CHECK (true)' if operation == 'UPDATE' else 'USING (true)'
                    cur.execute(sql.SQL('CREATE POLICY {} ON {} FOR {} TO {} {}').format(sql.Identifier('nimcet_backend_'+operation.lower()), target, sql.SQL(operation), role, sql.SQL(expression)))
            # SELECT FOR UPDATE requires UPDATE privilege on at least one column.
            # Role codes stay read-only; the repository locks roles during grants.
            cur.execute(sql.SQL('GRANT UPDATE (id) ON public.roles TO {}').format(role))
            cur.execute(sql.SQL('CREATE POLICY nimcet_backend_update_lock ON public.roles FOR UPDATE TO {} USING (true) WITH CHECK (true)').format(role))
            expected = {}
            cur.execute("SELECT 'auth.users'::regclass::oid")
            auth_users_oid = cur.fetchone()[0]
            for table in ACCESS:
                cur.execute(sql.SQL('SELECT count(*) FROM {}').format(sql.Identifier('public', table)))
                expected[table] = cur.fetchone()[0]
            # PostgreSQL 17 role creators may have ADMIN without SET permission.
            # Temporary operator membership is removed before committing setup.
            cur.execute(sql.SQL('GRANT {} TO postgres WITH SET TRUE, INHERIT FALSE').format(role))
            cur.execute(sql.SQL('SET LOCAL ROLE {}').format(role))
            for table, operations in ACCESS.items():
                cur.execute(sql.SQL('SELECT count(*) FROM {}').format(sql.Identifier('public', table)))
                assert cur.fetchone()[0] == expected[table], 'RLS visibility differs: '+table
                for operation in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'):
                    cur.execute('SELECT has_table_privilege(current_user,%s,%s)', ('public.'+table, operation))
                    assert cur.fetchone()[0] == (operation in operations), (table, operation)
            cur.execute('SELECT id FROM public.roles LIMIT 0 FOR UPDATE')
            cur.execute("SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname=current_user")
            assert cur.fetchone() == (False, False, False, False, False)
            cur.execute("SELECT has_schema_privilege(current_user,'public','CREATE'),has_table_privilege(current_user,%s::oid,'SELECT')", (auth_users_oid,))
            assert cur.fetchone() == (False, False)
            cur.execute('RESET ROLE')
            cur.execute(sql.SQL('REVOKE {} FROM postgres').format(role))
            # Ignored recovery file preserves the new secret if pooler login fails
            # after the database transaction commits. Never contains owner secrets.
            pending.write_text('DATABASE_URL='+runtime.render_as_string(hide_password=False)+'\n', encoding='utf-8')
    # Validate the actual pooler login before installing its credentials locally.
    with connect(runtime) as c:
        assert c.pgconn.ssl_in_use
        with c.cursor() as cur:
            cur.execute('SELECT current_user')
            assert cur.fetchone()[0] == ROLE
            cur.execute('SELECT count(*) FROM public.tests')
            cur.fetchone()
    assert env_path.read_text(encoding='utf-8') == original, 'Concurrent .env edit; refusing overwrite.'
    replacement = 'DATABASE_URL='+runtime.render_as_string(hide_password=False)
    env_path.write_text(re.sub(r'^\s*DATABASE_URL\s*=.*$', lambda _: replacement, original, flags=re.M), encoding='utf-8')
    pending.unlink()
    print(json.dumps({'status':'success','role':ROLE,'verified_tables':len(ACCESS),'tls':'verify-full','database_url_updated':True,'feature_flags_changed':False}))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # Never disclose generated credentials, connection strings or SQL parameters.
        print(json.dumps({'status':'failed','error_type':type(exc).__name__,
                          'reason':getattr(getattr(exc,'diag',None),'message_primary',None)}))
        raise SystemExit(1) from None
