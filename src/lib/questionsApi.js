import { getSupabaseConfigError, supabase } from './supabase'

export const QUESTION_PAGE_SIZE = 10

function safeSearchTerm(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function applyQuestionFilters(query, filters = {}) {
  const subject = filters.subject === 'all' ? '' : filters.subject
  if (subject) query = query.eq('subject', subject)
  const topic = safeSearchTerm(filters.topic)
  if (topic) query = query.ilike('topic', `%${topic}%`)
  if (filters.difficulty === 'unspecified') query = query.is('difficulty', null)
  else if (filters.difficulty) query = query.eq('difficulty', filters.difficulty)
  if (filters.questionType === 'MCQ') query = query.not('options', 'is', null)
  if (filters.year && /^\d{4}$/.test(String(filters.year))) {
    query = query.eq('exam_year', Number(filters.year))
  }

  const search = safeSearchTerm(filters.search)
  if (search) {
    query = query.or(
      `question.ilike.%${search}%,topic.ilike.%${search}%,subject.ilike.%${search}%,section.ilike.%${search}%`
    )
  }
  return query
}

function applySort(query, sort) {
  if (sort === 'question-number') {
    return query.order('question_number', { ascending: true }).order('id', { ascending: true })
  }
  return query.order('created_at', { ascending: false }).order('id', { ascending: false })
}

async function fetchQuestionPage({ page, pageSize, filters, signal }) {
  if (!supabase) throw getSupabaseConfigError()
  let query = supabase
    .from('questions')
    .select('*', { count: 'exact' })
    .eq('status', 'published')

  query = applyQuestionFilters(query, filters)
  query = applySort(query, filters?.sort)
  if (signal) query = query.abortSignal(signal)

  const from = (page - 1) * pageSize
  const { data, count, error } = await query.range(from, from + pageSize - 1)
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getQuestions({
  page = 1,
  pageSize = QUESTION_PAGE_SIZE,
  filters = {},
  signal,
} = {}) {
  const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize) || QUESTION_PAGE_SIZE)))
  let safePage = Math.max(1, Math.floor(Number(page) || 1))
  let result = await fetchQuestionPage({ page: safePage, pageSize: safePageSize, filters, signal })

  const lastPage = Math.max(1, Math.ceil(result.count / safePageSize))
  if (safePage > lastPage) {
    safePage = lastPage
    result = await fetchQuestionPage({ page: safePage, pageSize: safePageSize, filters, signal })
  }

  return { ...result, page: safePage, pageSize: safePageSize }
}

export async function getQuestionById(id, { signal } = {}) {
  if (id == null || String(id).trim() === '') return null
  if (!supabase) throw getSupabaseConfigError()

  let query = supabase
    .from('questions')
    .select('*')
    .eq('status', 'published')
    .eq('id', String(id))
    .maybeSingle()

  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getRandomMathematicsQuestions(limit = 10, { signal } = {}) {
  const safeLimit = Math.max(1, Math.floor(Number(limit) || 10))
  const { count } = await getQuestions({
    page: 1,
    pageSize: 1,
    filters: { subject: 'Mathematics' },
    signal,
  })
  const sampleSize = Math.min(safeLimit, count)
  if (!sampleSize) return []

  const indexes = new Set()
  while (indexes.size < sampleSize) indexes.add(Math.floor(Math.random() * count))

  const results = await Promise.all([...indexes].map(async (index) => {
    const result = await getQuestions({
      page: index + 1,
      pageSize: 1,
      filters: { subject: 'Mathematics' },
      signal,
    })
    return result.data[0]
  }))
  return results.filter(Boolean)
}

export async function getQuestionFacets({ signal } = {}) {
  if (!supabase) throw getSupabaseConfigError()

  const subjects = new Set()
  const topics = new Set()
  const pageSize = 1000
  let from = 0

  while (true) {
    let query = supabase
      .from('questions')
      .select('subject, topic')
      .eq('status', 'published')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (signal) query = query.abortSignal(signal)

    const { data, error } = await query
    if (error) throw error
    for (const row of data ?? []) {
      if (row.subject?.trim()) subjects.add(row.subject.trim())
      if (row.topic?.trim()) topics.add(row.topic.trim())
    }
    if (!data || data.length < pageSize) break
    from += pageSize
  }

  return {
    subjects: [...subjects].sort((a, b) => a.localeCompare(b)).map((name) => ({ id: name, name })),
    topics: [...topics].sort((a, b) => a.localeCompare(b)),
  }
}
