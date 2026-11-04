SELECT
    (SELECT count(*)
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE') AS public_table_count,

    (SELECT count(*)
     FROM public.examinations) AS examination_count,

    (SELECT count(*)
     FROM public.sections) AS section_count,

    (SELECT count(*)
     FROM public.subjects) AS subject_count,

    (SELECT count(*)
     FROM public.chapters) AS chapter_count,

    (SELECT count(*)
     FROM public.topics) AS topic_count;