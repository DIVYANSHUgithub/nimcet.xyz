-- Phase 8 local draft only. Do not apply until migration history, the runtime
-- role privilege model, and a disposable PostgreSQL 17 rehearsal are reviewed.
-- Question IDs and Auth IDs use types verified by the read-only live audit.
-- Question text/options/key are snapshotted into a test version for stability;
-- the existing public.questions table is not modified.

CREATE TABLE public.tests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    examination_code text NOT NULL,
    code text,
    title text NOT NULL,
    kind text NOT NULL,
    visibility text NOT NULL DEFAULT 'public',
    owner_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
    created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tests_title_nonempty CHECK (length(btrim(title)) > 0),
    CONSTRAINT tests_examination_code_nonempty CHECK (length(btrim(examination_code)) > 0),
    CONSTRAINT tests_kind_check CHECK (
        kind IN ('full_length', 'section', 'subject', 'custom', 'pyq', 'daily')
    ),
    CONSTRAINT tests_visibility_check CHECK (visibility IN ('public', 'private')),
    CONSTRAINT tests_status_check CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT tests_private_owner_check CHECK (visibility <> 'private' OR owner_id IS NOT NULL)
);

CREATE UNIQUE INDEX tests_examination_code_key
    ON public.tests (examination_code, code)
    WHERE code IS NOT NULL;
CREATE INDEX tests_public_status_idx
    ON public.tests (status, kind, created_at DESC)
    WHERE visibility = 'public';
CREATE INDEX tests_owner_created_idx
    ON public.tests (owner_id, created_at DESC)
    WHERE owner_id IS NOT NULL;

CREATE TABLE public.test_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id uuid NOT NULL REFERENCES public.tests (id) ON DELETE RESTRICT,
    version_number integer NOT NULL,
    duration_seconds integer NOT NULL,
    attempt_limit integer NOT NULL DEFAULT 1,
    available_from timestamptz,
    available_until timestamptz,
    shuffle_questions boolean NOT NULL DEFAULT false,
    shuffle_options boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'draft',
    review_policy jsonb NOT NULL DEFAULT '{"results":"after_submit","answers":"with_results"}'::jsonb,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT test_versions_test_number_key UNIQUE (test_id, version_number),
    CONSTRAINT test_versions_number_check CHECK (version_number > 0),
    CONSTRAINT test_versions_duration_check CHECK (duration_seconds BETWEEN 1 AND 86400),
    CONSTRAINT test_versions_attempt_limit_check CHECK (attempt_limit BETWEEN 1 AND 100),
    CONSTRAINT test_versions_schedule_check CHECK (
        available_until IS NULL OR available_from IS NULL OR available_until > available_from
    ),
    CONSTRAINT test_versions_status_check CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT test_versions_published_at_check CHECK (
        (status <> 'published') OR published_at IS NOT NULL
    ),
    CONSTRAINT test_versions_review_policy_object_check CHECK (
        jsonb_typeof(review_policy) = 'object'
    )
);
CREATE INDEX test_versions_test_status_idx ON public.test_versions (test_id, status, version_number DESC);
CREATE INDEX test_versions_available_idx ON public.test_versions (available_from, available_until)
    WHERE status = 'published';

CREATE TABLE public.test_sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_version_id uuid NOT NULL REFERENCES public.test_versions (id) ON DELETE RESTRICT,
    code text NOT NULL,
    title text NOT NULL,
    display_order integer NOT NULL,
    default_marks numeric(8,3) NOT NULL DEFAULT 4,
    default_negative_marks numeric(8,3) NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT test_sections_code_key UNIQUE (test_version_id, code),
    CONSTRAINT test_sections_order_key UNIQUE (test_version_id, display_order),
    CONSTRAINT test_sections_code_nonempty CHECK (length(btrim(code)) > 0),
    CONSTRAINT test_sections_title_nonempty CHECK (length(btrim(title)) > 0),
    CONSTRAINT test_sections_display_order_check CHECK (display_order >= 0),
    CONSTRAINT test_sections_marks_check CHECK (default_marks > 0),
    CONSTRAINT test_sections_negative_marks_check CHECK (default_negative_marks >= 0)
);

CREATE TABLE public.test_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_section_id uuid NOT NULL REFERENCES public.test_sections (id) ON DELETE RESTRICT,
    question_id bigint NOT NULL REFERENCES public.questions (id) ON DELETE RESTRICT,
    display_order integer NOT NULL,
    marks numeric(8,3),
    negative_marks numeric(8,3),
    question_snapshot text NOT NULL,
    options_snapshot jsonb NOT NULL,
    correct_option_snapshot smallint NOT NULL,
    explanation_snapshot text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT test_questions_section_order_key UNIQUE (test_section_id, display_order),
    CONSTRAINT test_questions_section_question_key UNIQUE (test_section_id, question_id),
    CONSTRAINT test_questions_display_order_check CHECK (display_order >= 0),
    CONSTRAINT test_questions_marks_check CHECK (marks IS NULL OR marks > 0),
    CONSTRAINT test_questions_negative_marks_check CHECK (
        negative_marks IS NULL OR negative_marks >= 0
    ),
    CONSTRAINT test_questions_snapshot_question_check CHECK (length(btrim(question_snapshot)) > 0),
    CONSTRAINT test_questions_snapshot_options_check CHECK (
        jsonb_typeof(options_snapshot) = 'array' AND jsonb_array_length(options_snapshot) = 4
    ),
    CONSTRAINT test_questions_correct_option_check CHECK (correct_option_snapshot BETWEEN 0 AND 3)
);
CREATE INDEX test_questions_question_idx ON public.test_questions (question_id);

CREATE TABLE public.test_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_version_id uuid NOT NULL REFERENCES public.test_versions (id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    attempt_number integer NOT NULL,
    status text NOT NULL DEFAULT 'in_progress',
    started_at timestamptz NOT NULL DEFAULT now(),
    deadline_at timestamptz NOT NULL,
    submitted_at timestamptz,
    submission_reason text,
    current_display_order integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT test_attempts_user_number_key UNIQUE (test_version_id, user_id, attempt_number),
    CONSTRAINT test_attempts_number_check CHECK (attempt_number > 0),
    CONSTRAINT test_attempts_status_check CHECK (
        status IN ('in_progress', 'submitted', 'expired', 'terminated')
    ),
    CONSTRAINT test_attempts_time_check CHECK (deadline_at > started_at),
    CONSTRAINT test_attempts_submission_time_check CHECK (
        submitted_at IS NULL OR submitted_at >= started_at
    ),
    CONSTRAINT test_attempts_submission_reason_check CHECK (
        submission_reason IS NULL OR submission_reason IN ('student_submitted', 'timer_expired', 'admin_terminated')
    ),
    CONSTRAINT test_attempts_terminal_state_check CHECK (
        (status = 'in_progress' AND submitted_at IS NULL)
        OR (status <> 'in_progress' AND submitted_at IS NOT NULL)
    )
);
CREATE INDEX test_attempts_user_started_idx ON public.test_attempts (user_id, started_at DESC);
CREATE INDEX test_attempts_active_lookup_idx
    ON public.test_attempts (test_version_id, user_id)
    WHERE status = 'in_progress';

CREATE TABLE public.attempt_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id uuid NOT NULL REFERENCES public.test_attempts (id) ON DELETE CASCADE,
    test_question_id uuid NOT NULL REFERENCES public.test_questions (id) ON DELETE RESTRICT,
    display_order integer NOT NULL,
    option_order jsonb NOT NULL,
    visited boolean NOT NULL DEFAULT false,
    marked_for_review boolean NOT NULL DEFAULT false,
    first_seen_at timestamptz,
    last_seen_at timestamptz,
    CONSTRAINT attempt_questions_test_question_key UNIQUE (attempt_id, test_question_id),
    CONSTRAINT attempt_questions_order_key UNIQUE (attempt_id, display_order),
    CONSTRAINT attempt_questions_display_order_check CHECK (display_order >= 0),
    CONSTRAINT attempt_questions_option_order_check CHECK (
        jsonb_typeof(option_order) = 'array' AND jsonb_array_length(option_order) = 4
    )
);
CREATE INDEX attempt_questions_test_question_idx ON public.attempt_questions (test_question_id);

CREATE TABLE public.attempt_answers (
    attempt_question_id uuid PRIMARY KEY REFERENCES public.attempt_questions (id) ON DELETE CASCADE,
    selected_option_id text,
    version bigint NOT NULL DEFAULT 1,
    saved_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT attempt_answers_version_check CHECK (version > 0),
    CONSTRAINT attempt_answers_option_id_check CHECK (
        selected_option_id IS NULL OR selected_option_id ~ '^option-[0-3]$'
    )
);

CREATE TABLE public.test_submissions (
    attempt_id uuid PRIMARY KEY REFERENCES public.test_attempts (id) ON DELETE RESTRICT,
    submission_reason text NOT NULL,
    submitted_at timestamptz NOT NULL,
    evaluation_version smallint NOT NULL DEFAULT 1,
    CONSTRAINT test_submissions_reason_check CHECK (
        submission_reason IN ('student_submitted', 'timer_expired')
    ),
    CONSTRAINT test_submissions_evaluation_version_check CHECK (evaluation_version > 0)
);

CREATE TABLE public.test_results (
    attempt_id uuid PRIMARY KEY REFERENCES public.test_submissions (attempt_id) ON DELETE RESTRICT,
    score numeric(12,3) NOT NULL,
    maximum_score numeric(12,3) NOT NULL,
    correct_count integer NOT NULL,
    incorrect_count integer NOT NULL,
    unanswered_count integer NOT NULL,
    released_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT test_results_maximum_score_check CHECK (maximum_score >= 0),
    CONSTRAINT test_results_counts_check CHECK (
        correct_count >= 0 AND incorrect_count >= 0 AND unanswered_count >= 0
    )
);

CREATE TABLE public.section_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id uuid NOT NULL REFERENCES public.test_submissions (attempt_id) ON DELETE RESTRICT,
    test_section_id uuid NOT NULL REFERENCES public.test_sections (id) ON DELETE RESTRICT,
    score numeric(12,3) NOT NULL,
    maximum_score numeric(12,3) NOT NULL,
    correct_count integer NOT NULL,
    incorrect_count integer NOT NULL,
    unanswered_count integer NOT NULL,
    CONSTRAINT section_results_attempt_section_key UNIQUE (attempt_id, test_section_id),
    CONSTRAINT section_results_counts_check CHECK (
        correct_count >= 0 AND incorrect_count >= 0 AND unanswered_count >= 0
    )
);
CREATE FUNCTION public.prevent_published_test_version_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'published' THEN
            RAISE EXCEPTION 'test versions must be published through the review workflow' USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
    END IF;
    IF OLD.status = 'published' THEN
        RAISE EXCEPTION 'published test versions are immutable' USING ERRCODE = '55000';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.prevent_published_test_section_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    version_status text;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.test_version_id IS DISTINCT FROM OLD.test_version_id THEN
        RAISE EXCEPTION 'a test section cannot be moved between versions' USING ERRCODE = '55000';
    END IF;
    SELECT v.status INTO version_status
    FROM public.test_versions AS v
    WHERE v.id = CASE WHEN TG_OP = 'INSERT' THEN NEW.test_version_id ELSE OLD.test_version_id END;
    IF version_status = 'published' THEN
        RAISE EXCEPTION 'published test sections are immutable' USING ERRCODE = '55000';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.prevent_published_test_question_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    version_status text;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.test_section_id IS DISTINCT FROM OLD.test_section_id THEN
        RAISE EXCEPTION 'a test question cannot be moved between sections' USING ERRCODE = '55000';
    END IF;
    SELECT v.status INTO version_status
    FROM public.test_sections AS s
    JOIN public.test_versions AS v ON v.id = s.test_version_id
    WHERE s.id = CASE WHEN TG_OP = 'INSERT' THEN NEW.test_section_id ELSE OLD.test_section_id END;
    IF version_status = 'published' THEN
        RAISE EXCEPTION 'published test questions are immutable' USING ERRCODE = '55000';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER test_versions_immutable
    BEFORE INSERT OR UPDATE OR DELETE ON public.test_versions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_published_test_version_change();
CREATE TRIGGER test_sections_immutable
    BEFORE INSERT OR UPDATE OR DELETE ON public.test_sections
    FOR EACH ROW EXECUTE FUNCTION public.prevent_published_test_section_change();
CREATE TRIGGER test_questions_immutable
    BEFORE INSERT OR UPDATE OR DELETE ON public.test_questions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_published_test_question_change();

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_results ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
    public.tests, public.test_versions, public.test_sections, public.test_questions,
    public.test_attempts, public.attempt_questions, public.attempt_answers,
    public.test_submissions, public.test_results, public.section_results
FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.prevent_published_test_version_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.prevent_published_test_section_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.prevent_published_test_question_change() FROM PUBLIC, anon, authenticated;
