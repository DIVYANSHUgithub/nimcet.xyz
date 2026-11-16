-- Local development draft; production application requires owner approval.
CREATE TABLE public.pyq_papers (
 test_version_id uuid PRIMARY KEY REFERENCES public.test_versions(id) ON DELETE RESTRICT,
 examination_code text NOT NULL, year integer NOT NULL CHECK(year BETWEEN 1900 AND 2200),
 title text NOT NULL CHECK(length(btrim(title))>0), metadata jsonb NOT NULL,
 snapshot_digest text NOT NULL CHECK(snapshot_digest ~ '^[0-9a-f]{64}$'),
 approved_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 approved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pyq_papers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pyq_papers FROM anon,authenticated;
CREATE INDEX pyq_papers_exam_year_idx ON public.pyq_papers(examination_code,year);
ALTER TABLE public.test_questions ADD COLUMN question_blocks_snapshot jsonb;
ALTER TABLE public.test_questions ADD COLUMN explanation_blocks_snapshot jsonb;
ALTER TABLE public.test_results ADD COLUMN scoring_version text NOT NULL DEFAULT 'mcq-index-v1';
CREATE FUNCTION public.protect_finalized_results() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $$
 BEGIN RAISE EXCEPTION 'Finalized results are immutable; use an approved reevaluation process'; END;
$$;
REVOKE ALL ON FUNCTION public.protect_finalized_results() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER finalized_result_immutable BEFORE UPDATE OR DELETE ON public.test_results
 FOR EACH ROW EXECUTE FUNCTION public.protect_finalized_results();
CREATE TRIGGER finalized_section_result_immutable BEFORE UPDATE OR DELETE ON public.section_results
 FOR EACH ROW EXECUTE FUNCTION public.protect_finalized_results();
CREATE FUNCTION public.protect_pyq_approval() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $$
 BEGIN
  IF EXISTS(SELECT 1 FROM public.test_versions WHERE id=OLD.test_version_id AND status='published') THEN
   RAISE EXCEPTION 'Published PYQ metadata is immutable';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
 END;
$$;
REVOKE ALL ON FUNCTION public.protect_pyq_approval() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER published_pyq_immutable BEFORE UPDATE OR DELETE ON public.pyq_papers
 FOR EACH ROW EXECUTE FUNCTION public.protect_pyq_approval();
DO $runtime$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='nimcet_backend') THEN
  GRANT UPDATE(question_blocks_snapshot,explanation_blocks_snapshot) ON public.test_questions TO nimcet_backend;
  CREATE POLICY phase5_draft_snapshot_update ON public.test_questions FOR UPDATE TO nimcet_backend USING(true) WITH CHECK(true);
  GRANT SELECT,INSERT,UPDATE ON public.pyq_papers TO nimcet_backend;
  CREATE POLICY runtime_pyq ON public.pyq_papers TO nimcet_backend USING(true) WITH CHECK(true);
 END IF;
END $runtime$;

-- Finalized answer rows must remain consistent with their stored result.
CREATE FUNCTION public.protect_finalized_answers() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP<>'INSERT' AND EXISTS(SELECT 1 FROM public.attempt_questions q JOIN public.test_attempts a ON a.id=q.attempt_id
     WHERE q.id=OLD.attempt_question_id AND a.status<>'in_progress') THEN
  RAISE EXCEPTION 'Finalized answers are immutable';
 END IF;
 IF TG_OP<>'DELETE' AND EXISTS(SELECT 1 FROM public.attempt_questions q JOIN public.test_attempts a ON a.id=q.attempt_id
     WHERE q.id=NEW.attempt_question_id AND a.status<>'in_progress') THEN
  RAISE EXCEPTION 'Finalized answers are immutable';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_finalized_answers() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER finalized_answers_immutable BEFORE INSERT OR UPDATE OR DELETE ON public.attempt_answers
 FOR EACH ROW EXECUTE FUNCTION public.protect_finalized_answers();
