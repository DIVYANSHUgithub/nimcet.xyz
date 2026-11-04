import { useEffect, useState } from 'react'
import SectionHeader from './SectionHeader'
import DailyQuestionCard from './DailyQuestionCard'
import Container from './ui/Container'
import { getRandomMathematicsQuestions } from '../lib/questionsApi'
import { normalizeQuestion } from '../utils/normalizeQuestion'
import { formatDisplayDate } from '../utils/formatDate'
import { useDailyDateKey } from '../hooks/useDailyDateKey'

export default function DailyQuestions() {
  const dateKey = useDailyDateKey()
  const [expandedQuestion, setExpandedQuestion] = useState({ key: null, id: null })
  const [questions, setQuestions] = useState([])
  const [loadError, setLoadError] = useState('')
  const [requestRevision, setRequestRevision] = useState(0)
  const requestKey = `${dateKey}:${requestRevision}`
  const [loadedRequestKey, setLoadedRequestKey] = useState('')
  const loading = loadedRequestKey !== requestKey

  useEffect(() => {
    const controller = new AbortController()
    getRandomMathematicsQuestions(10, { signal: controller.signal, seed: `${dateKey}:daily-questions` })
      .then((rows) => {
        setQuestions(rows.map((row) => {
          const question = normalizeQuestion(row)
          return {
            ...question,
            answer: question.correctAnswer || 'Answer not provided',
            explanation: question.explanation || 'An explanation is not available for this question yet.',
          }
        }))
        setLoadError('')
        setLoadedRequestKey(requestKey)
      })
      .catch((error) => {
        if (error.name === 'AbortError' || controller.signal.aborted) return
        console.error('Questions of the day loading failed:', error)
        setLoadError('Unable to load mathematics questions. Please try again.')
        setLoadedRequestKey(requestKey)
      })

    return () => controller.abort()
  }, [dateKey, requestKey])

  const handleToggle = (id) => setExpandedQuestion((previous) => (
    previous.key === requestKey && previous.id === id
      ? { key: requestKey, id: null }
      : { key: requestKey, id }
  ))

  return (
    <section className="bg-canvas-muted py-14 sm:py-16">
      <Container>
        <SectionHeader  title="Questions of the Day" subtitle="Today's focus: Mathematics" meta={
          <span className="inline-block rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white">
            {formatDisplayDate()}
          </span>
        } />
        <p className="mb-6 max-w-2xl text-sm leading-6 text-ink-muted">Practice {questions.length || 10} randomly selected mathematics questions from the published question bank.</p>
        {loading ? (
          <p className="rounded-lg border border-line bg-surface p-5 text-sm text-ink-muted" role="status">Loading questions from the question bank…</p>
        ) : loadError ? (
          <div className="rounded-lg border border-danger-border bg-danger-bg p-5" role="alert">
            <p className="text-sm text-danger">{loadError}</p>
            <button type="button" className="mt-3 text-sm font-semibold text-ink-heading underline underline-offset-2" onClick={() => setRequestRevision((revision) => revision + 1)}>Try again</button>
          </div>
        ) : questions.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-5 text-sm text-ink-muted">No published mathematics questions are available yet.</p>
        ) : (
          <div className="space-y-3">
            {questions.map((question, index) => (
              <DailyQuestionCard
                key={question.id}
                question={question}
                index={index}
                total={questions.length}
                isExpanded={expandedQuestion.key === requestKey && expandedQuestion.id === question.id}
                onToggle={() => handleToggle(question.id)}
              />
            ))}
          </div>
        )}
      </Container>
    </section>
  )
}
