import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Toast from '../components/Toast'
import Breadcrumbs from '../components/questions/Breadcrumbs'
import QuestionBankSidebar from '../components/questions/QuestionBankSidebar'
// import QuestionBankRightSidebar from '../components/questions/QuestionBankRightSidebar'
import QuestionBankHeader from '../components/questions/QuestionBankHeader'
import QuestionFilters from '../components/questions/QuestionFilters'
import QuestionList from '../components/questions/QuestionList'
import Pagination from '../components/questions/Pagination'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import { getQuestions, QUESTION_PAGE_SIZE } from '../lib/questionsApi'
import { normalizeQuestion } from '../utils/normalizeQuestion'
import { useQuestionFacets } from '../hooks/useQuestionFacets'

export default function QuestionBank() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { subjects, topics } = useQuestionFacets()
  const subjectParam = searchParams.get('subject') || 'all'
  const subject = subjectParam === 'all' || subjects.some((item) => item.id === subjectParam) ? subjectParam : 'all'
  const topic = searchParams.get('topic') || ''
  const [questions, setQuestions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('search') || '')
  const [requestRevision, setRequestRevision] = useState(0)
  const [difficulty, setDifficulty] = useState('')
  const [questionType, setQuestionType] = useState('')
  const [year, setYear] = useState('')
  const [sort, setSort] = useState('question-number')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
      const params = new URLSearchParams(searchParams)
      if (search.trim()) params.set('search', search.trim())
      else params.delete('search')
      if (params.toString() !== searchParams.toString()) setSearchParams(params, { replace: true })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search, searchParams, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    getQuestions({
      page,
      pageSize: QUESTION_PAGE_SIZE,
      signal: controller.signal,
      filters: { subject, topic, difficulty, questionType, year, search: debouncedSearch, sort },
    })
      .then((result) => {
        setQuestions(result.data.map(normalizeQuestion))
        setTotal(result.count)
        if (result.page !== page) setPage(result.page)
      })
      .catch((error) => {
        if (error.name === 'AbortError' || controller.signal.aborted) return
        console.error('Question bank loading failed:', error)
        setLoadError('Unable to load questions. Please refresh and try again.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [page, subject, topic, difficulty, questionType, year, debouncedSearch, sort, requestRevision])

  const patchQuery = (nextValues, replace = false) => {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(nextValues)) {
      if (!value || value === 'all') params.delete(key)
      else params.set(key, value)
    }
    setSearchParams(params, { replace })
    setPage(1)
    setLoading(true)
    setLoadError('')
  }

  const updateFilter = (setter, value) => {
    setter(value)
    setPage(1)
    setLoading(true)
    setLoadError('')
  }

  const handleSubjectChange = (value) => patchQuery({ subject: value })
  const handleTopicChange = (value) => patchQuery({ topic: value }, true)
  const handleSearchChange = (value) => {
    setSearch(value)
    setLoading(true)
    setLoadError('')
  }
  const handlePageChange = (nextPage) => {
    setPage(nextPage)
    setLoading(true)
    setLoadError('')
  }
  const handleBookmark = () => setToast('Question bookmarks are not available yet. No question was saved.')

  const clearAllFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setDifficulty('')
    setQuestionType('')
    setYear('')
    setSort('newest')
    patchQuery({ subject: '', topic: '' }, true)
  }

  const handleQuickLink = async (id) => {
    if (id === 'recent') {
      clearAllFilters()
      setToast('Showing the newest published questions.')
      return
    }
    if (id === 'random') {
      setToast('Finding a random published question…')
      try {
        const { count } = await getQuestions({ page: 1, pageSize: 1 })
        if (!count) {
          setToast('There are no published questions to open.')
          return
        }
        const randomIndex = Math.floor(Math.random() * count)
        const result = await getQuestions({ page: randomIndex + 1, pageSize: 1 })
        if (result.data[0]) navigate(`/questions/${encodeURIComponent(result.data[0].id)}`)
        else setToast('A question could not be selected. Please try again.')
      } catch (error) {
        console.error('Random question lookup failed:', error)
        setToast('Unable to find a random question right now.')
      }
      return
    }
    if (id === 'pyqs') {
      setToast('Previous-year questions are unavailable in the published dataset; the available exam year is 2026.')
      return
    }
    if (id === 'important') {
      setToast('The published question data has no verified “important” classification.')
      return
    }
    if (id === 'attempted') {
      setToast('Attempt counts are not stored in the published question data.')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / QUESTION_PAGE_SIZE))
  const start = total ? (page - 1) * QUESTION_PAGE_SIZE + 1 : 0
  const end = Math.min(page * QUESTION_PAGE_SIZE, total)

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <Container className="pt-4">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Question Bank' }]} />
      </Container>

      <main className="mx-auto grid w-full max-w-content flex-1 grid-cols-1 items-start gap-5 px-5 pb-12 pt-4 md:px-8 min-[1100px]:grid-cols-[15rem_minmax(0,1fr)_17rem] min-[1100px]:gap-6">
        <QuestionBankSidebar
          subjects={subjects}
          selectedSubjectId={subject}
          onSubjectSelect={handleSubjectChange}
          onQuickLink={handleQuickLink}
          className="order-2 min-[1100px]:order-1 min-[1100px]:col-start-1 min-[1100px]:row-start-1"
        />

        <section className="order-1 min-w-0 min-[1100px]:order-2 min-[1100px]:col-start-2 min-[1100px]:row-start-1" aria-label="Question list">
          <QuestionBankHeader search={search} onSearchChange={handleSearchChange} />
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
          />

          {loadError ? (
            <div className="rounded-lg border border-danger-border bg-danger-bg p-5" role="alert">
              <p className="mb-3 text-sm text-danger">{loadError}</p>
              <Button variant="secondary" onClick={() => {
                setLoading(true)
                setLoadError('')
                setRequestRevision((revision) => revision + 1)
              }}>Try again</Button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-ink-muted" aria-live="polite">
                {loading ? 'Loading questions…' : total === 0 ? 'No matching questions' : `Showing ${start}–${end} of ${total} published questions`}
              </p>
              {loading && questions.length === 0 ? (
                <div className="rounded-lg border border-line bg-surface p-6 text-sm text-ink-muted" role="status">Loading published questions…</div>
              ) : total === 0 ? (
                <div className="rounded-lg border border-line bg-surface p-6 text-sm text-ink-muted">No published questions match these filters. Try clearing a filter or search term.</div>
              ) : (
                <>
                  <QuestionList questions={questions} pageStartIndex={start} onBookmark={handleBookmark} />
                  <Pagination page={page} totalPages={totalPages} start={start} end={end} totalLabel={String(total)} onPageChange={handlePageChange} />
                </>
              )}
            </>
          )}
        </section>

        {/* <QuestionBankRightSidebar topics={topics.slice(0, 9)} onTopicSelect={(value) => patchQuery({ topic: value }, false)} className="order-3 min-[1100px]:order-3 min-[1100px]:col-start-3 min-[1100px]:row-start-1" /> */}
      </main>
      <Footer />
      <Toast message={toast} onDismiss={() => setToast('')} />
    </div>
  )
}
