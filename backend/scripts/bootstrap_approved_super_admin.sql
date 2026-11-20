-- One-time operator transaction for the owner-selected account.
-- Project: wcxxyyebcgofziylgwdg. Not an automatic migration.
-- User explicitly selected this UUID for first-super-administrator setup.
DO $bootstrap$
DECLARE
    target_id uuid := '7367f508-253f-4a98-a06e-0236f198296c';
    target_role smallint;
    new_assignment uuid;
    audit_reason text := 'Owner-selected first super administrator during guided test-engine setup';
BEGIN
    IF current_user <> 'postgres' OR NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls)
    ) THEN
        RAISE EXCEPTION 'Bootstrap requires the verified database operator';
    END IF;
    PERFORM pg_advisory_xact_lock(746128310221);
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=target_id AND email_confirmed_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Selected Auth account is absent or unconfirmed';
    END IF;
    SELECT id INTO target_role FROM public.roles
    WHERE code='super_administrator' FOR UPDATE;
    IF target_role IS NULL THEN
        RAISE EXCEPTION 'Super administrator role is missing';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE role_id=target_role)
       OR EXISTS (SELECT 1 FROM public.admin_audit_log
                  WHERE action_code='role.bootstrap_first_super_administrator') THEN
        RAISE EXCEPTION 'First-administrator bootstrap has already occurred';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=target_id AND revoked_at IS NULL) THEN
        RAISE EXCEPTION 'Selected account already has an active role';
    END IF;
    INSERT INTO public.user_roles (user_id,role_id,granted_by,grant_reason)
    VALUES (target_id,target_role,NULL,audit_reason)
    RETURNING assignment_id INTO new_assignment;
    INSERT INTO public.admin_audit_log
        (actor_user_id,action_code,entity_type,entity_id,request_id,reason,after_state)
    VALUES (NULL,'role.bootstrap_first_super_administrator','user_role',new_assignment::text,
            'first-super-admin-bootstrap:'||new_assignment::text,audit_reason,
            jsonb_build_object('user_id',target_id,'role_code','super_administrator'));
END;
$bootstrap$;
