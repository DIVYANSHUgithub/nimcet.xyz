-- Preserve published-row RLS and safe legacy question browsing; keys stay server-only.
REVOKE SELECT ON public.questions FROM PUBLIC, anon, authenticated;
REVOKE SELECT (correct_option, explanation) ON public.questions FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, exam, exam_year, section, question_number, question, options,
              subject, topic, difficulty, source, status, created_at)
    ON public.questions TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
