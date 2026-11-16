-- Development migration. Rehearse and obtain approval before production use.
-- No original question rows are transformed or imported.
ALTER TABLE public.questions ADD COLUMN content_document jsonb;
ALTER TABLE public.questions ADD COLUMN revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0);
ALTER TABLE public.questions ADD COLUMN editorial_state text NOT NULL DEFAULT 'draft'
 CHECK (editorial_state IN ('draft','review','published','archived'));
ALTER TABLE public.questions ADD COLUMN subtopic_id uuid REFERENCES public.topics(id) ON DELETE RESTRICT;
ALTER TABLE public.questions ADD COLUMN author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.questions ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.questions ADD CONSTRAINT question_document_object CHECK
 (content_document IS NULL OR (jsonb_typeof(content_document)='object' AND content_document->>'schema_version'='1'));
CREATE INDEX questions_subtopic_idx ON public.questions(subtopic_id);
CREATE TABLE public.question_media (
 id uuid PRIMARY KEY, object_path text NOT NULL UNIQUE, content_type text NOT NULL,
 byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.question_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.question_media FROM anon, authenticated;
CREATE TABLE public.question_occurrences (
 question_id bigint NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
 exam text NOT NULL CHECK(length(btrim(exam))>0),
 year integer NOT NULL CHECK(year BETWEEN 1900 AND 2200),
 section text NOT NULL CHECK(length(btrim(section))>0),
 position integer NOT NULL CHECK(position BETWEEN 1 AND 1000),
 source text NOT NULL CHECK(length(btrim(source))>0),
 PRIMARY KEY(exam,year,section,position)
);
CREATE INDEX question_occurrences_question_idx ON public.question_occurrences(question_id);
ALTER TABLE public.question_occurrences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.question_occurrences FROM anon, authenticated;
-- Runtime grants are explicit and conditional, preserving clean local installs.
DO $runtime$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nimcet_backend') THEN
  GRANT SELECT, INSERT, UPDATE ON public.questions TO nimcet_backend;
  GRANT USAGE, SELECT ON SEQUENCE public.questions_id_seq TO nimcet_backend;
  CREATE POLICY phase2_question_select ON public.questions FOR SELECT TO nimcet_backend USING(true);
  CREATE POLICY phase2_question_insert ON public.questions FOR INSERT TO nimcet_backend WITH CHECK(true);
  CREATE POLICY phase2_question_update ON public.questions FOR UPDATE TO nimcet_backend USING(true) WITH CHECK(true);
  GRANT SELECT, INSERT, DELETE ON public.question_occurrences TO nimcet_backend;
  CREATE POLICY phase2_occurrences ON public.question_occurrences TO nimcet_backend USING(true) WITH CHECK(true);
  GRANT SELECT, INSERT ON public.question_media TO nimcet_backend;
  CREATE POLICY phase2_media_select ON public.question_media FOR SELECT TO nimcet_backend USING(true);
  CREATE POLICY phase2_media_insert ON public.question_media FOR INSERT TO nimcet_backend WITH CHECK(true);
  GRANT SELECT, INSERT, UPDATE ON public.examinations,public.sections,public.subjects,public.chapters,public.topics TO nimcet_backend;
  CREATE POLICY phase2_exams ON public.examinations TO nimcet_backend USING(true) WITH CHECK(true);
  CREATE POLICY phase2_sections ON public.sections TO nimcet_backend USING(true) WITH CHECK(true);
  CREATE POLICY phase2_subjects ON public.subjects TO nimcet_backend USING(true) WITH CHECK(true);
  CREATE POLICY phase2_chapters ON public.chapters TO nimcet_backend USING(true) WITH CHECK(true);
  CREATE POLICY phase2_topics ON public.topics TO nimcet_backend USING(true) WITH CHECK(true);
 END IF;
END $runtime$;
-- Restrict browser reads to the legacy safe projection. Never grant SELECT on
-- content_document: it includes the explanation and correct stable option ID.
REVOKE SELECT ON public.questions FROM anon, authenticated;
REVOKE SELECT (correct_option,explanation,content_document) ON public.questions FROM anon, authenticated;
GRANT SELECT (id,exam,exam_year,section,question_number,question,options,subject,topic,difficulty,source,status,created_at)
 ON public.questions TO anon, authenticated;
-- Bucket creation remains an explicit owner-approved Storage operation.
