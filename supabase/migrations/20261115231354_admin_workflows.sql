-- Development draft only. Review/rehearse before owner-approved production use.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE revoked_at IS NULL GROUP BY user_id HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Conflicting active roles require explicit reconciliation';
 END IF;
END $$;
CREATE UNIQUE INDEX user_roles_one_primary_key ON public.user_roles(user_id) WHERE revoked_at IS NULL;
CREATE TABLE public.account_status (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('active','suspended')), suspended_until timestamptz,
 reason text NOT NULL CHECK(length(btrim(reason))>=10),
 changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_status FROM anon,authenticated;
ALTER TABLE public.test_versions ADD COLUMN workflow_state text NOT NULL DEFAULT 'draft' CHECK(workflow_state IN ('draft','submitted','approved','rejected'));
ALTER TABLE public.test_versions ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.test_versions ADD COLUMN submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.test_versions ADD COLUMN reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.test_versions ADD COLUMN review_reason text;
ALTER TABLE public.test_versions ADD COLUMN workflow_revision integer NOT NULL DEFAULT 0 CHECK(workflow_revision>=0);
ALTER TABLE public.question_media ADD COLUMN archived_at timestamptz;
ALTER TABLE public.question_media ADD COLUMN archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX test_versions_review_queue_idx ON public.test_versions(updated_at,id) WHERE status='draft' AND workflow_state='submitted';
CREATE INDEX test_attempts_deadline_idx ON public.test_attempts(deadline_at,id) WHERE status='in_progress';
CREATE FUNCTION public.freeze_reviewed_configuration() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.workflow_state IN ('submitted','approved') AND
 (NEW.duration_seconds,NEW.attempt_limit,NEW.available_from,NEW.available_until,NEW.shuffle_questions,NEW.shuffle_options,NEW.review_policy)
 IS DISTINCT FROM
 (OLD.duration_seconds,OLD.attempt_limit,OLD.available_from,OLD.available_until,OLD.shuffle_questions,OLD.shuffle_options,OLD.review_policy) THEN
  RAISE EXCEPTION 'Submitted and approved configuration is frozen';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.freeze_reviewed_configuration() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER freeze_reviewed_configuration BEFORE UPDATE ON public.test_versions FOR EACH ROW EXECUTE FUNCTION public.freeze_reviewed_configuration();
CREATE FUNCTION public.freeze_reviewed_content() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE version_id uuid; state text;
BEGIN
 IF TG_TABLE_NAME='test_sections' THEN
  IF TG_OP='UPDATE' AND NEW.test_version_id IS DISTINCT FROM OLD.test_version_id THEN RAISE EXCEPTION 'Section membership is immutable'; END IF;
  version_id := CASE WHEN TG_OP='INSERT' THEN NEW.test_version_id ELSE OLD.test_version_id END;
 ELSE
  IF TG_OP='UPDATE' AND NEW.test_section_id IS DISTINCT FROM OLD.test_section_id THEN RAISE EXCEPTION 'Question membership is immutable'; END IF;
  SELECT test_version_id INTO version_id FROM public.test_sections WHERE id=CASE WHEN TG_OP='INSERT' THEN NEW.test_section_id ELSE OLD.test_section_id END;
 END IF;
 SELECT workflow_state INTO state FROM public.test_versions WHERE id=version_id FOR SHARE;
 IF state IN ('submitted','approved') THEN RAISE EXCEPTION 'Submitted and approved content is frozen'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.freeze_reviewed_content() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER freeze_reviewed_sections BEFORE INSERT OR UPDATE OR DELETE ON public.test_sections FOR EACH ROW EXECUTE FUNCTION public.freeze_reviewed_content();
CREATE TRIGGER freeze_reviewed_questions BEFORE INSERT OR UPDATE OR DELETE ON public.test_questions FOR EACH ROW EXECUTE FUNCTION public.freeze_reviewed_content();
-- New Auth accounts receive an ordinary Student assignment. Existing accounts
-- are not modified or duplicated. No privileged bootstrap is performed.
CREATE SCHEMA IF NOT EXISTS nimcet_private;
REVOKE ALL ON SCHEMA nimcet_private FROM PUBLIC,anon,authenticated;
CREATE FUNCTION nimcet_private.assign_new_student() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 INSERT INTO public.user_roles(user_id,role_id,grant_reason)
 SELECT NEW.id,id,'Trusted student registration' FROM public.roles WHERE code='student';
 IF NOT FOUND THEN RAISE EXCEPTION 'Student role is unavailable'; END IF;
 INSERT INTO public.admin_audit_log(action_code,entity_type,entity_id,reason,after_state)
 VALUES('role.student_registered','user',NEW.id::text,'Trusted student registration','{"role_code":"student"}'::jsonb);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION nimcet_private.assign_new_student() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER assign_new_student AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION nimcet_private.assign_new_student();
DO $runtime$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='nimcet_backend') THEN
  GRANT SELECT,INSERT,UPDATE ON public.account_status TO nimcet_backend;
  CREATE POLICY runtime_account_status ON public.account_status TO nimcet_backend USING(true) WITH CHECK(true);
  GRANT UPDATE(archived_at,archived_by) ON public.question_media TO nimcet_backend;
  CREATE POLICY runtime_media_archive ON public.question_media FOR UPDATE TO nimcet_backend USING(true) WITH CHECK(true);
 END IF;
END $runtime$;
