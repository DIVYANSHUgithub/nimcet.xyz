ALTER TABLE public.test_sections
    ADD COLUMN duration_seconds integer
    CHECK (duration_seconds BETWEEN 1 AND 86400);
