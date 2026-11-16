import { useEffect, useState } from 'react'
import { Bookmark, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getRandomMathematicsQuestions, submitPracticeAnswer } from '../lib/questionsApi'
import { normalizeQuestion } from '../utils/normalizeQuestion'
import Badge from './ui/Badge'
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
  const [interaction, setInteraction] = useState({ key: null, showAnswer: false, selectedOption: '' })
  const [toast, setToast] = useState('')
  const [loginMessage, setLoginMessage] = useState('')

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

  const handleOptionSelect = async (index) => {
    if (!user) {
      setLoginMessage('Sign in to choose an answer and practice this question.')
      return
    }
    setInteraction({ key: dateKey, showAnswer: false, selectedOption: String(index), pending: true })
    try {
      const feedback = await submitPracticeAnswer(question.id, question.optionIds[index], question.revision)
      setInteraction({ key: dateKey, showAnswer: true, selectedOption: String(index), feedback, pending: false })
    } catch {
      setInteraction({ key: dateKey, showAnswer: false, selectedOption: '', pending: false })
      setToast('Unable to check your answer. Please try again.')
    }
  }

  const requestCurrent = request.key === dateKey
  const question = requestCurrent ? request.question : null
  const showAnswer = interaction.key === dateKey && interaction.showAnswer
  const selectedOption = interaction.key === dateKey ? interaction.selectedOption : ''
  return (
    <>
      <article className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
        {!requestCurrent ? <p className="text-sm text-ink-muted" role="status">Loading a published question…</p> : request.error ? <p className="text-sm text-danger" role="alert">{request.error}</p> : !question ? <p className="text-sm text-ink-muted">No published questions are available yet.</p> : (
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
                const selected = selectedOption === String(index)
                const isCorrect = showAnswer && question.optionIds[index] === interaction.feedback?.correct_option_id
                return (
                  <label key={`${question.id}-choice-${index}`} className={`flex min-h-11 min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-6 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${isCorrect ? 'border-success-border bg-success-bg' : selected ? 'border-option-selected-border bg-option-selected' : 'border-line hover:bg-canvas-muted'}`}>
                    <input className="sr-only" type="radio" name={`featured-${question.id}`} checked={selected} disabled={interaction.pending || Boolean(interaction.feedback)} onChange={() => handleOptionSelect(index)} />
                    <span className="font-semibold text-ink-muted">{String.fromCharCode(65 + index)}.</span>
                    <span className="min-w-0 break-words text-ink"><QuestionOptionContent option={option} /></span>
                  </label>
                )
              })}
            </fieldset>
            {showAnswer && <div className="mt-4 rounded-lg border border-success-border bg-success-bg p-3 text-sm leading-6 text-ink" role="region" aria-label="Answer and explanation">
              <div className="mb-1 font-semibold text-ink-heading">Answer: <QuestionOptionContent option={question.options[question.optionIds.indexOf(interaction.feedback?.correct_option_id)]} /></div>
              {interaction.feedback?.explanation_blocks?.length ? <RichContent blocks={interaction.feedback.explanation_blocks} /> : <QuestionMedia text={interaction.feedback?.explanation} />}
            </div>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/questions/${encodeURIComponent(question.id)}?answer=show`} state={{ selectedOptionId: selectedOption === '' ? null : question.optionIds[Number(selectedOption)] }} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                View answer <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line-strong px-4 text-sm font-medium text-ink-heading hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setToast('Bookmarks are not available yet. This question was not saved.')}>
                <Bookmark size={16} aria-hidden="true" /> Save question
              </button>
            </div>
          </>
        )}
      </article>
      <LoginPrompt message={loginMessage} onClose={() => setLoginMessage('')} />
      <Toast message={toast} onDismiss={() => setToast('')} />
    </>
  )
}
