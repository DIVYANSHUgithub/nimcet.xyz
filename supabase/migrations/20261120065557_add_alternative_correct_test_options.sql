ALTER TABLE public.test_questions
    ADD COLUMN alternate_correct_option_snapshot smallint,
    ADD CONSTRAINT test_questions_alternate_correct_option_check CHECK (
        alternate_correct_option_snapshot IS NULL OR (
            alternate_correct_option_snapshot BETWEEN 0 AND 3
            AND alternate_correct_option_snapshot <> correct_option_snapshot
        )
    );
