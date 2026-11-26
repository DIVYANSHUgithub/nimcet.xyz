import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Toast from '../components/Toast'
import Breadcrumbs from '../components/questions/Breadcrumbs'
import QuestionBankHeader from '../components/questions/QuestionBankHeader'
import QuestionFilters from '../components/questions/QuestionFilters'
import QuestionList from '../components/questions/QuestionList'
import Pagination from '../components/questions/Pagination'
import Button from '../components/ui/Button'
import { getQuestions, QUESTION_PAGE_SIZE } from '../lib/questionsApi'
import { normalizeQuestion } from '../utils/normalizeQuestion'
import { useQuestionFacets } from '../hooks/useQuestionFacets'

export default function QuestionBank() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { subjects } = useQuestionFacets()
  const subject = searchParams.get('subject') || ''
  const topic = searchParams.get('topic') || ''
  const subtopicId = searchParams.get('subtopic') || ''
  const exam = searchParams.get('exam') || ''
  const section = searchParams.get('section') || ''
  const pyq = searchParams.get('pyq') === 'true'
  const appliedSearch = searchParams.get('search') || ''
  const [searchDraft, setSearchDraft] = useState(null)
  const search = searchDraft?.appliedSearch === appliedSearch ? searchDraft.value : appliedSearch
  const [response, setResponse] = useState(null)
  const [requestRevision, setRequestRevision] = useState(0)
  const [difficulty, setDifficulty] = useState('')
  const [questionType, setQuestionType] = useState('')
  const [year, setYear] = useState('')
  const [sort, setSort] = useState('question-number')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState('')
  const requestKey = JSON.stringify([page, subject, topic, subtopicId, exam, section, pyq, difficulty, questionType, year, appliedSearch, sort, requestRevision])
  const current = response?.key === requestKey ? response : null
  const total = current?.data?.count ?? 0
  const resultPage = current?.data?.page ?? page

  useEffect(() => {
    const value = search.trim()
    if (value === appliedSearch) return
    const timer = window.setTimeout(() => {
      setSearchDraft(null)
      setPage(1)
      const params = new URLSearchParams(searchParams)
      if (value) params.set('search', value)
      else params.delete('search')
      setSearchParams(params, { replace: true })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search, appliedSearch, searchParams, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    getQuestions({
      page,
      pageSize: QUESTION_PAGE_SIZE,
      signal: controller.signal,
      filters: { subject, topic, subtopicId, exam, section, pyq, difficulty, questionType, year, search: appliedSearch, sort },
    })
      .then((result) => {
        if (!controller.signal.aborted) setResponse({ key: requestKey, data: result })
      })
      .catch((error) => {
        if (error.name === 'AbortError' || controller.signal.aborted) return
        console.error('Question bank loading failed:', error)
        setResponse({ key: requestKey, error: 'Unable to load questions. Please try again.' })
      })

    return () => controller.abort()
  }, [page, subject, topic, subtopicId, exam, section, pyq, difficulty, questionType, year, appliedSearch, sort, requestKey])

  const patchQuery = (nextValues, replace = false) => {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(nextValues)) {
      if (!value || value === 'all') params.delete(key)
      else params.set(key, value)
    }
    setSearchParams(params, { replace })
    setPage(1)
  }

  const updateFilter = (setter, value) => {
    setter(value)
    setPage(1)
  }

  const handleSubjectChange = (value) => patchQuery({ subject: value })
  const handleTopicChange = (value) => patchQuery({ topic: value }, true)
  const handleBookmark = () => setToast('Question bookmarks are not available yet. No question was saved.')

  const clearAllFilters = () => {
    setSearchDraft(null)
    setDifficulty('')
    setQuestionType('')
    setYear('')
    setSort('question-number')
    patchQuery({ subject: '', topic: '', subtopic: '', exam: '', section: '', pyq: '', search: '' }, true)
  }

  const totalPages = Math.max(1, Math.ceil(total / QUESTION_PAGE_SIZE))
  const start = total ? (resultPage - 1) * QUESTION_PAGE_SIZE + 1 : 0
  const end = Math.min(resultPage * QUESTION_PAGE_SIZE, total)
  const activeFilterCount = [subject, topic, subtopicId, exam, section, pyq, difficulty, questionType, year].filter(Boolean).length

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-4 md:px-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Question Bank' }]} />
        <div className="mt-5">
          <QuestionBankHeader search={search} onSearchChange={(value) => setSearchDraft({ appliedSearch, value })} />
          <QuestionFilters
            subjects={subjects}
            subject={subject}
            onSubjectChange={handleSubjectChange}
            topic={topic}
            onTopicChange={handleTopicChange}
            difficulty={difficulty}
            onDifficultyChange={(value) => updateFilter(setDifficulty, value)}
            questionType={questionType}
            onQuestionTypeChange={(value) => updateFilter(setQuestionType, value)}
            year={year}
            onYearChange={(value) => updateFilter(setYear, value)}
            sort={sort}
            onSortChange={(value) => updateFilter(setSort, value)}
            onClear={clearAllFilters}
            activeFilterCount={activeFilterCount}
          />
        </div>

        <section aria-label="Question list">
          {!current ? (
            <p className="text-sm text-ink-muted" role="status">Loading questions…</p>
          ) : current.error ? (
            <div className="rounded-xl border border-danger-border bg-danger-bg p-5" role="alert">
              <p className="mb-3 text-sm text-danger">{current.error}</p>
              <Button variant="secondary" onClick={() => setRequestRevision((revision) => revision + 1)}>Try again</Button>
            </div>
          ) : total === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-6 text-sm text-ink-muted" role="status">No published questions match these filters. Try clearing a filter or search term.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-ink-muted" aria-live="polite">
                Showing {start}–{end} of {total} published questions
              </p>
              <QuestionList questions={current.data.data.map(normalizeQuestion)} pageStartIndex={start} onBookmark={handleBookmark} />
              <Pagination page={resultPage} totalPages={totalPages} start={start} end={end} totalLabel={String(total)} onPageChange={setPage} />
            </>
          )}
        </section>
      </main>
      <Footer />
      <Toast message={toast} onDismiss={() => setToast('')} />
    </div>
  )
}
