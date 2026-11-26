import { useEffect, useRef, useState } from 'react'
import SectionHeader from './SectionHeader'
import DailyQuestionCard from './DailyQuestionCard'
import Button from './ui/Button'
import Container from './ui/Container'
import { checkDailyChallengeAnswer, getRandomMathematicsQuestions } from '../lib/questionsApi'
import { normalizeQuestion } from '../utils/normalizeQuestion'
import { formatDisplayDate } from '../utils/formatDate'
import { useDailyDateKey } from '../hooks/useDailyDateKey'

function DailyQuestionSet({ questions }) {
  const [choices, setChoices] = useState({})
  const [results, setResults] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const request = useRef(null)

  useEffect(() => () => {
    request.current?.abort()
    request.current = null
  }, [])

  const answered = Object.keys(choices).length
  const total = questions.length

  async function handleSubmit(event) {
    event.preventDefault()
    if (answered === 0 || request.current || results) return

    const controller = new AbortController()
    request.current = controller
    setSubmitting(true)
    setSubmitError('')

    try {
      const checked = await Promise.all(questions.map(async ({ id, revision }) => {
        if (!Object.hasOwn(choices, id)) return [id, 'unanswered']
        try {
          const { is_correct: isCorrect } = await checkDailyChallengeAnswer(id, choices[id], revision, { signal: controller.signal })
          if (typeof isCorrect !== 'boolean') throw new Error('Answer check returned no result')
          return [id, isCorrect]
        } catch (error) {
          if (['answer_unavailable', 'revision_conflict', 'content_not_found'].includes(error.code)) return [id, null]
          throw error
        }
      }))
      if (!controller.signal.aborted) setResults(Object.fromEntries(checked))
    } catch {
      if (!controller.signal.aborted) {
        setSubmitError('We couldn’t check your answers. Your choices are still selected. Please try again.')
        controller.abort()
      }
    } finally {
      if (request.current === controller) {
        request.current = null
        setSubmitting(false)
      }
    }
  }

  const outcomes = results ? Object.values(results) : []
  const correct = outcomes.filter((value) => value === true).length
  const unavailable = outcomes.filter((value) => value === null).length
  const graded = answered - unavailable
  const skipped = total - answered

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {questions.map((question, index) => (
        <DailyQuestionCard
          key={question.id}
          question={question}
          index={index}
          total={total}
          selectedOptionId={choices[question.id]}
          onSelect={(optionId) => setChoices((current) => ({ ...current, [question.id]: optionId }))}
          locked={submitting || Boolean(results)}
          result={results?.[question.id]}
        />
      ))}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-6">
        {submitError && <p className="mb-3 text-sm text-danger" role="alert">{submitError}</p>}
        <div role="status" className={results ? 'space-y-1' : 'sr-only'}>
          {results && <>
            <h3 className="text-lg font-bold text-ink-heading">{graded === 0 ? 'Results unavailable' : `${correct} of ${graded} correct`}</h3>
            {skipped > 0 && <p className="text-sm text-ink-muted">{skipped} of {total} questions skipped.</p>}
            {unavailable > 0 && <p className="text-sm text-ink-muted">{unavailable} of {answered} submitted answers couldn’t be graded.</p>}
          </>}
          {submitting && 'Checking your answers…'}
        </div>
        {!results && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <label htmlFor="daily-answer-progress" className="block text-sm font-semibold text-ink-heading">{answered} of {total} answered</label>
              <progress id="daily-answer-progress" className="block h-2 w-full accent-brand sm:w-44" value={answered} max={total} />
            </div>
            <Button type="submit" size="lg" disabled={answered === 0 || submitting}>
              {submitting ? 'Checking answers…' : 'Submit answers'}
            </Button>
          </div>
        )}
      </div>
    </form>
  )
}

export default function DailyQuestions() {
  const dateKey = useDailyDateKey()
  const [request, setRequest] = useState(null)
  const [requestRevision, setRequestRevision] = useState(0)
  const requestKey = `${dateKey}:${requestRevision}`
  const current = request?.key === requestKey ? request : null

  useEffect(() => {
    const controller = new AbortController()
    getRandomMathematicsQuestions(10, { signal: controller.signal, seed: `${dateKey}:daily-questions`, questionType: 'MCQ' })
      .then((rows) => {
        if (controller.signal.aborted) return
        const questions = rows.map(normalizeQuestion)
          .filter((question) => !question.validationIssues.some((issue) => ['missing-id', 'missing-question', 'missing-options'].includes(issue)))
        setRequest({ key: requestKey, questions })
      })
      .catch((error) => {
        if (error.name === 'AbortError' || controller.signal.aborted) return
        console.error('Questions of the day loading failed:', error)
        setRequest({ key: requestKey, error: 'Unable to load mathematics questions. Please try again.' })
      })

    return () => controller.abort()
  }, [dateKey, requestKey])

  return (
    <section className="bg-canvas-muted py-14 sm:py-16">
      <Container>
        <SectionHeader title="Questions of the Day" subtitle="Answer as many as you like, then submit to see how you did." meta={
          <time dateTime={dateKey} className="inline-block rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-heading">
            {formatDisplayDate(new Date(`${dateKey}T00:00:00+05:30`))}
          </time>
        } />
        {!current ? (
          <p className="rounded-lg border border-line bg-surface p-5 text-sm text-ink-muted" role="status">Loading today’s questions…</p>
        ) : current.error ? (
          <div className="rounded-lg border border-danger-border bg-danger-bg p-5" role="alert">
            <p className="text-sm text-danger">{current.error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => setRequestRevision((revision) => revision + 1)}>Try again</Button>
          </div>
        ) : current.questions.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-5 text-sm text-ink-muted">No multiple-choice mathematics questions are available yet.</p>
        ) : (
          <DailyQuestionSet key={requestKey} questions={current.questions} />
        )}
      </Container>
    </section>
  )
}
