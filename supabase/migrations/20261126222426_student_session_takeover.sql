ALTER TABLE public.student_device_sessions ADD COLUMN session_started_at timestamptz;

-- Give the backend a scoped lookup without granting it access to Auth tables.
CREATE FUNCTION nimcet_private.device_session_started_at(account_id uuid, auth_session_id uuid)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT created_at FROM auth.sessions WHERE user_id = account_id AND id = auth_session_id
$$;

REVOKE ALL ON FUNCTION nimcet_private.device_session_started_at(uuid, uuid)
    FROM PUBLIC, anon, authenticated, service_role;

DO $$
BEGIN
    IF to_regrole('nimcet_backend') IS NOT NULL THEN
        GRANT USAGE ON SCHEMA nimcet_private TO nimcet_backend;
        GRANT EXECUTE ON FUNCTION nimcet_private.device_session_started_at(uuid, uuid) TO nimcet_backend;
    END IF;
END $$;
