-- Phase 6 local draft only. Do not apply until migration history, backend
-- database access, and the first super-administrator bootstrap are approved.
-- There are intentionally no policies or grants. Since production default
-- privileges grant new public tables/sequences to API roles, explicitly revoke
-- direct client privileges from these new objects below.
-- Role assignments must be made only by a backend route requiring
-- super_administrator and must append an admin_audit_log event in the same txn.

CREATE TABLE public.roles (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code text NOT NULL,
    display_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT roles_code_key UNIQUE (code),
    CONSTRAINT roles_code_check CHECK (
        code IN ('student', 'editor', 'administrator', 'super_administrator')
    ),
    CONSTRAINT roles_display_name_nonempty CHECK (length(btrim(display_name)) > 0)
);

INSERT INTO public.roles (code, display_name) VALUES
    ('student', 'Student'),
    ('editor', 'Editor'),
    ('administrator', 'Administrator'),
    ('super_administrator', 'Super administrator');

CREATE TABLE public.user_roles (
    assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role_id smallint NOT NULL,
    granted_by uuid,
    grant_reason text NOT NULL,
    granted_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    revocation_reason text,
    CONSTRAINT user_roles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT user_roles_role_id_fkey
        FOREIGN KEY (role_id) REFERENCES public.roles (id) ON DELETE RESTRICT,
    CONSTRAINT user_roles_granted_by_fkey
        FOREIGN KEY (granted_by) REFERENCES auth.users (id) ON DELETE SET NULL,
    CONSTRAINT user_roles_grant_reason_nonempty CHECK (length(btrim(grant_reason)) > 0),
    CONSTRAINT user_roles_revocation_reason_check CHECK (
        revoked_at IS NULL OR (revocation_reason IS NOT NULL AND length(btrim(revocation_reason)) > 0)
    ),
    CONSTRAINT user_roles_revocation_time_check CHECK (
        revoked_at IS NULL OR revoked_at >= granted_at
    )
);

CREATE UNIQUE INDEX user_roles_one_active_assignment_key
    ON public.user_roles (user_id, role_id)
    WHERE revoked_at IS NULL;

CREATE INDEX user_roles_role_id_idx ON public.user_roles (role_id);

CREATE TABLE public.admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid,
    action_code text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    request_id text,
    reason text,
    before_state jsonb,
    after_state jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT admin_audit_actor_user_id_fkey
        FOREIGN KEY (actor_user_id) REFERENCES auth.users (id) ON DELETE SET NULL,
    CONSTRAINT admin_audit_action_nonempty CHECK (length(btrim(action_code)) > 0),
    CONSTRAINT admin_audit_entity_type_nonempty CHECK (length(btrim(entity_type)) > 0),
    CONSTRAINT admin_audit_entity_id_nonempty CHECK (length(btrim(entity_id)) > 0),
    CONSTRAINT admin_audit_before_state_object_check CHECK (
        before_state IS NULL OR jsonb_typeof(before_state) = 'object'
    ),
    CONSTRAINT admin_audit_after_state_object_check CHECK (
        after_state IS NULL OR jsonb_typeof(after_state) = 'object'
    )
);

CREATE INDEX admin_audit_log_created_at_idx
    ON public.admin_audit_log (created_at DESC, id DESC);

CREATE INDEX admin_audit_log_entity_idx
    ON public.admin_audit_log (entity_type, entity_id, created_at DESC);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
    public.roles, public.user_roles, public.admin_audit_log
FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE public.roles_id_seq
FROM anon, authenticated;