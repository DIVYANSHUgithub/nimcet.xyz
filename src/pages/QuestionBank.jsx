
import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Toast from '../components/Toast'
import Breadcrumbs from '../components/questions/Breadcrumbs'
import QuestionBankSidebar from '../components/questions/QuestionBankSidebar'
import QuestionBankRightSidebar from '../components/questions/QuestionBankRightSidebar'
import QuestionBankHeader from '../components/questions/QuestionBankHeader'
import QuestionFilters from '../components/questions/QuestionFilters'
import QuestionList from '../components/questions/QuestionList'
import Pagination from '../components/questions/Pagination'
import { getUniqueValues } from '../data/questionBank'
import { getQuestions } from '../lib/questionsApi'
import {
  filterAndSortQuestions,
  paginateQuestions,
} from '../utils/filterQuestions'

const sectionSubjects = [
  {
    match: 'mathematics',
    subject: 'Mathematics',
  },
  {
    match: 'reasoning',
    subject: 'Reasoning',
  },
  {
    match: 'analytical',
    subject: 'Reasoning',
  },
  {
    match: 'computer',
    subject: 'Computer',
  },
  {
    match: 'english',
    subject: 'English',
  },
]

function normalizeQuestion(row) {
  const section = row.section || ''
  const normalizedSection = section.toLowerCase()

  const subject =
    sectionSubjects.find(({ match }) =>
      normalizedSection.includes(match)
    )?.subject || row.subject || 'Mathematics'

  return {
    id: row.id,
    subject,
    chapter: row.topic || section,
    topic: row.topic || section,
    difficulty: row.difficulty || 'Medium',
    type: 'MCQ',
    question: row.question,
    options: row.options,
    answer:
      row.correct_option == null
        ? ''
        : String.fromCharCode(65 + row.correct_option),
    explanation: row.explanation || '',
    attempts: 0,
    year: row.exam_year,
    createdAt: row.created_at,
    source: row.source,
    questionNumber: row.question_number,
  }
}

export default function QuestionBank() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [search, setSearch] = useState('')
  const [sidebarSubject, setSidebarSubject] = useState('mathematics')
  const [subjectTab, setSubjectTab] = useState('all')
  const [chapter, setChapter] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [questionType, setQuestionType] = useState('')
  const [year, setYear] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadQuestions() {
      setLoading(true)
      setLoadError('')

      try {
        const rows = await getQuestions({ limit: 1000 })

        if (!cancelled) {
          setQuestions(rows.map(normalizeQuestion))
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            'Unable to load questions. Please refresh and try again.'
          )
          console.error('Question bank loading failed:', error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadQuestions()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredPool = useMemo(() => {
    if (subjectTab === 'all') return questions

    const map = {
      mathematics: 'Mathematics',
      reasoning: 'Reasoning',
      computer: 'Computer',
      english: 'English',
    }

    return questions.filter(
      (q) => q.subject === map[subjectTab]
    )
  }, [questions, subjectTab])

  const chapterOptions = useMemo(
    () => getUniqueValues(filteredPool, 'chapter'),
    [filteredPool]
  )

  const topicOptions = useMemo(
    () => getUniqueValues(filteredPool, 'topic'),
    [filteredPool]
  )

  const yearOptions = useMemo(
    () => getUniqueValues(filteredPool, 'year').map(String),
    [filteredPool]
  )

  const filtered = useMemo(
    () =>
      filterAndSortQuestions(filteredPool, {
        search,
        subjectTab,
        chapter,
        topic,
        difficulty,
        questionType,
        year,
        sort,
      }),
    [
      filteredPool,
      search,
      subjectTab,
      chapter,
      topic,
      difficulty,
      questionType,
      year,
      sort,
    ]
  )

  const pagination = useMemo(
    () => paginateQuestions(filtered, page),
    [filtered, page]
  )

  useEffect(() => {
    setPage(1)
  }, [
    search,
    subjectTab,
    sidebarSubject,
    chapter,
    topic,
    difficulty,
    questionType,
    year,
    sort,
  ])

  const handleSubjectTabChange = (tabId) => {
    setSubjectTab(tabId)
    if (tabId !== 'all') setSidebarSubject(tabId)
  }

  const handleSidebarSubject = (subjectId) => {
    setSidebarSubject(subjectId)
    setSubjectTab(subjectId)
  }

  const handleBookmark = () => {
    setToast('Login required to save questions.')
  }

  return (
    <div className="qb-page">
      <Navbar />

      <div className="container qb-page__breadcrumb-wrap">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Question Bank' },
          ]}
        />
      </div>

      <main className="container qb-page__layout">
        <QuestionBankSidebar
          selectedSubjectId={sidebarSubject}
          onSubjectSelect={handleSidebarSubject}
        />

        <section className="qb-main" aria-label="Question list">
          <QuestionBankHeader
            search={search}
            onSearchChange={setSearch}
          />

          <QuestionFilters
            subjectTab={subjectTab}
            onSubjectTabChange={handleSubjectTabChange}
            chapter={chapter}
            topic={topic}
            difficulty={difficulty}
            questionType={questionType}
            year={year}
            sort={sort}
            onChapterChange={setChapter}
            onTopicChange={setTopic}
            onDifficultyChange={setDifficulty}
            onQuestionTypeChange={setQuestionType}
            onYearChange={setYear}
            onSortChange={setSort}
            chapterOptions={chapterOptions}
            topicOptions={topicOptions}
            yearOptions={yearOptions}
          />

          <p className="qb-count">
            {loading
              ? 'Loading questions...'
              : loadError
                ? 'Questions could not be loaded.'
                : `Showing ${pagination.start}–${pagination.end} of ${filtered.length} questions`}
          </p>

          {loadError ? (
            <div role="alert">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : !loading && filtered.length === 0 ? (
            <p>
              No published questions found. Questions will appear
              here after they are added to Supabase and published.
            </p>
          ) : !loading ? (
            <>
              <QuestionList
                questions={pagination.items}
                pageStartIndex={pagination.start}
                onBookmark={handleBookmark}
              />

              {filtered.length > 0 && (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  start={pagination.start}
                  end={pagination.end}
                  totalLabel={String(filtered.length)}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : null}
        </section>

        <QuestionBankRightSidebar />
      </main>

      <Footer />

      <Toast
        message={toast}
        onDismiss={() => setToast('')}
      />
    </div>
  )
}
