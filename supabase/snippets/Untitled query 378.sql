SELECT
    rolname,
    rolsuper,
    rolbypassrls,
    rolinherit,
    rolcanlogin
FROM pg_roles
WHERE rolname IN (
    'postgres',
    'anon',
    'authenticated',
    'service_role',
    'backend_runtime'
)
ORDER BY rolname;