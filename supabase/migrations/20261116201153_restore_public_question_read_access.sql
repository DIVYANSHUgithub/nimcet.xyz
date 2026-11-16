-- Owner-requested behavior: published practice questions, answers and explanations
-- are intentionally readable by every student, as before column hardening.
-- Existing published-row RLS policies remain unchanged.
GRANT SELECT ON public.questions TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
