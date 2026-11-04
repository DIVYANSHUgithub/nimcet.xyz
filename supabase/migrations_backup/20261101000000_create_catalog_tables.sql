-- Phase 3 draft: add the initial examination catalog.
-- This is an additive local migration draft; it has not been applied anywhere.
-- Catalog table boundaries/status vocabulary follow the reviewed design.
-- It deliberately leaves public.questions, its sequence, existing policies,
-- Auth users, Storage, and migration history untouched.
-- New tables have RLS enabled with no policies so client roles fail closed
-- until a separately reviewed access-policy migration is designed.
-- updated_at has an insert default; FastAPI must set it explicitly on updates.
-- Exam sections and academic subjects are separate children of examinations.

CREATE TABLE public.examinations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT examinations_code_key UNIQUE (code),
    CONSTRAINT examinations_code_nonempty CHECK (length(btrim(code)) > 0),
    CONSTRAINT examinations_name_nonempty CHECK (length(btrim(name)) > 0),
    CONSTRAINT examinations_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE public.sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    examination_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sections_examination_id_fkey
        FOREIGN KEY (examination_id) REFERENCES public.examinations (id) ON DELETE RESTRICT,
    CONSTRAINT sections_examination_code_key UNIQUE (examination_id, code),
    CONSTRAINT sections_display_order_check CHECK (display_order >= 0),
    CONSTRAINT sections_code_nonempty CHECK (length(btrim(code)) > 0),
    CONSTRAINT sections_name_nonempty CHECK (length(btrim(name)) > 0),
    CONSTRAINT sections_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE public.subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    examination_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT subjects_examination_id_fkey
        FOREIGN KEY (examination_id) REFERENCES public.examinations (id) ON DELETE RESTRICT,
    CONSTRAINT subjects_examination_code_key UNIQUE (examination_id, code),
    CONSTRAINT subjects_display_order_check CHECK (display_order >= 0),
    CONSTRAINT subjects_code_nonempty CHECK (length(btrim(code)) > 0),
    CONSTRAINT subjects_name_nonempty CHECK (length(btrim(name)) > 0),
    CONSTRAINT subjects_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE public.chapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chapters_subject_id_fkey
        FOREIGN KEY (subject_id) REFERENCES public.subjects (id) ON DELETE RESTRICT,
    CONSTRAINT chapters_subject_code_key UNIQUE (subject_id, code),
    CONSTRAINT chapters_display_order_check CHECK (display_order >= 0),
    CONSTRAINT chapters_code_nonempty CHECK (length(btrim(code)) > 0),
    CONSTRAINT chapters_name_nonempty CHECK (length(btrim(name)) > 0),
    CONSTRAINT chapters_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE public.topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT topics_chapter_id_fkey
        FOREIGN KEY (chapter_id) REFERENCES public.chapters (id) ON DELETE RESTRICT,
    CONSTRAINT topics_chapter_code_key UNIQUE (chapter_id, code),
    CONSTRAINT topics_display_order_check CHECK (display_order >= 0),
    CONSTRAINT topics_code_nonempty CHECK (length(btrim(code)) > 0),
    CONSTRAINT topics_name_nonempty CHECK (length(btrim(name)) > 0),
    CONSTRAINT topics_status_check CHECK (status IN ('active', 'inactive'))
);

-- The scoped unique constraints begin with each FK column and support those
-- lookups without additional redundant indexes. No speculative display-order
-- or status indexes are added before catalog query patterns are measured.

ALTER TABLE public.examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Supabase production default privileges grant table access to API roles.
-- Remove client SQL privileges explicitly so no-policy RLS is not the sole
-- protection. Existing tables and their ACLs are not affected.
REVOKE ALL PRIVILEGES ON TABLE
    public.examinations, public.sections, public.subjects, public.chapters, public.topics
FROM anon, authenticated;
