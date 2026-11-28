import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { checkDailyChallengeAnswer, getRandomMathematicsQuestions, submitDailyChallengeAnswer } from '../lib/questionsApi'
import { normalizeQuestion } from '../utils/normalizeQuestion'
import Badge from './ui/Badge'
import Button from './ui/Button'
import RichContent from './RichContent'
import Toast from './Toast'
import LoginPrompt from './LoginPrompt'
import { useAuth } from '../context/useAuth'
import { useDailyDateKey } from '../hooks/useDailyDateKey'
import { QuestionMedia, QuestionOptionContent } from './ui/QuestionMedia'

export default function HighlightQuestion() {
  const dateKey = useDailyDateKey()
  const { user } = useAuth()
  const [request, setRequest] = useState({ key: null, question: null, error: '' })
  const [interaction, setInteraction] = useState(null)
  const [toast, setToast] = useState('')
  const [loginMessage, setLoginMessage] = useState('')
  const closeLoginPrompt = useCallback(() => setLoginMessage(''), [])

  useEffect(() => {
    const controller = new AbortController()
    getRandomMathematicsQuestions(1, { signal: controller.signal, seed: `${dateKey}:daily-challenge` })
      .then((rows) => setRequest({ key: dateKey, question: rows[0] ? normalizeQuestion(rows[0]) : null, error: '' }))
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return
        console.error('Homepage question failed to load:', error)
        setRequest({ key: dateKey, question: null, error: 'A featured question could not be loaded.' })
      })
    return () => controller.abort()
  }, [dateKey])

  const requestCurrent = request.key === dateKey
  const question = requestCurrent ? request.question : null
  const current = interaction?.key === dateKey ? interaction : null
  const selectedIndex = current?.index ?? null
  const selectedOptionId = selectedIndex === null ? null : question?.optionIds[selectedIndex]
  const submitted = Boolean(current?.submittedBy && current.submittedBy === user?.id)
  const isCorrect = current?.submittedBy && !submitted ? undefined : current?.isCorrect

  const evaluateChoice = async (index, submit = false) => {
    const pending = { key: dateKey, index, pending: true }
    setInteraction(pending)
    try {
      const evaluate = submit ? submitDailyChallengeAnswer : checkDailyChallengeAnswer
      const result = await evaluate(question.id, question.optionIds[index], question.revision)
      setInteraction((previous) => previous === pending ? {
        key: dateKey, index, isCorrect: result.is_correct, submittedBy: submit ? user.id : null,
      } : previous)
    } catch (error) {
      setInteraction((previous) => previous === pending ? { key: dateKey, index: submit ? index : null } : previous)
      if (submit && error.status === 401) {
        setLoginMessage('Sign in to submit your answer to Today’s Challenge.')
      } else {
        setToast(submit ? 'Unable to submit your answer. Please try again.' : 'Unable to check your answer. Please try again.')
      }
    }
  }

  const handleOptionSelect = (index) => {
    if (user) setInteraction({ key: dateKey, index })
    else void evaluateChoice(index)
  }

  const handleSubmit = () => {
    if (!user) setLoginMessage('Sign in to submit your answer to Today’s Challenge.')
    else if (selectedIndex !== null) void evaluateChoice(selectedIndex, true)
  }
  return (
    <>
      <article className="flex min-h-80 flex-col rounded-xl border border-line bg-surface p-5 shadow-card sm:min-h-84 sm:p-6">
        {!requestCurrent ? (
          <div className="my-auto flex flex-col items-center gap-3 text-center text-sm font-semibold text-ink-heading" role="status">
            <span className="grid size-14 place-items-center rounded-full bg-info-bg text-accent" aria-hidden="true">
              <LoaderCircle size={28} className="motion-safe:animate-spin" />
            </span>
            Loading today’s question…
          </div>
        ) : request.error ? <p className="text-sm text-danger" role="alert">{request.error}</p> : !question ? <p className="text-sm text-ink-muted">No published questions are available yet.</p> : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                <span>{question.subject}</span>
                {question.topic && <><span aria-hidden="true">/</span><span>{question.topic}</span></>}
              </div>
              <Badge>{question.difficulty || 'Difficulty not provided'}</Badge>
            </div>
            <div className="mb-4 break-words text-base font-medium leading-7 text-ink-heading">{question.statementBlocks.length ? <RichContent blocks={question.statementBlocks} /> : <QuestionMedia text={question.question} imageUrl={question.questionImageUrl} />}</div>
            <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <legend className="mb-2 text-xs font-medium text-ink-muted">Choose an answer</legend>
              {question.options.map((option, index) => {
                const selected = selectedIndex === index
                return (
                  <label key={`${question.id}-choice-${index}`} className={`flex min-h-11 min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-6 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${selected ? 'border-option-selected-border bg-option-selected' : 'border-line hover:bg-canvas-muted'}`}>
                    <input className="sr-only" type="radio" name={`featured-${question.id}`} checked={selected} disabled={current?.pending || submitted} onChange={() => handleOptionSelect(index)} />
                    <span className="font-semibold text-ink-muted">{String.fromCharCode(65 + index)}.</span>
                    <span className="min-w-0 break-words text-ink"><QuestionOptionContent option={option} /></span>
                  </label>
                )
              })}
            </fieldset>
            <div role="status">
              {typeof isCorrect === 'boolean' && <p className={`mt-3 text-sm font-semibold ${isCorrect ? 'text-success' : 'text-danger'}`}>
                {isCorrect ? 'Correct' : 'Incorrect'}
              </p>}
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <Button as={Link} to={`/questions/${encodeURIComponent(question.id)}?answer=show`} state={{ selectedOptionId }}>
                View answer <ArrowRight size={16} aria-hidden="true" />
              </Button>
              <Button variant="secondary" disabled={Boolean(user && (selectedIndex === null || current?.pending || submitted))} onClick={handleSubmit}>
                {submitted ? 'Submitted' : 'Submit'}
              </Button>
            </div>
          </>
        )}
      </article>
      <LoginPrompt message={loginMessage} onClose={closeLoginPrompt} />
      <Toast message={toast} onDismiss={() => setToast('')} />
    </>
  )
}
