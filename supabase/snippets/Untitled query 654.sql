SELECT
    p.proname AS function_name,
    line_number,
    line
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL regexp_split_to_table(
    pg_get_functiondef(p.oid),
    E'\n'
) WITH ORDINALITY AS definition(line, line_number)
WHERE n.nspname = 'public'
  AND p.proname IN (
      'prevent_published_test_section_change',
      'prevent_published_test_question_change'
  )
ORDER BY p.proname, line_number;