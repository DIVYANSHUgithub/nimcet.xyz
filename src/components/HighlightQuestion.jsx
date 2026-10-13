import { useEffect, useState } from 'react'
import { Bookmark, ChevronDown, ChevronUp } from 'lucide-react'
import { getQuestions } from '../lib/questionsApi'
import { normalizeQuestion } from '../utils/normalizeQuestion'
import MathText from './MathText'
import Badge from './ui/Badge'
import Toast from './Toast'

export default function HighlightQuestion() {
  const [request, setRequest] = useState({ loading: true, question: null, error: '' })
  const [showAnswer, setShowAnswer] = useState(false)
  const [selectedOption, setSelectedOption] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getQuestions({ page: 1, pageSize: 1, signal: controller.signal })
      .then(({ data }) => setRequest({ loading: false, question: data[0] ? normalizeQuestion(data[0]) : null, error: '' }))
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return
        console.error('Homepage question failed to load:', error)
        setRequest({ loading: false, question: null, error: 'A featured question could not be loaded.' })
      })
    return () => controller.abort()
  }, [])

  const question = request.question
  return (
    <>
      <article className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
        {request.loading ? <p className="text-sm text-ink-muted" role="status">Loading a published question…</p> : request.error ? <p className="text-sm text-danger" role="alert">{request.error}</p> : !question ? <p className="text-sm text-ink-muted">No published questions are available yet.</p> : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                <span>{question.subject}</span>
                {question.topic && <><span aria-hidden="true">/</span><span>{question.topic}</span></>}
              </div>
              <Badge>{question.difficulty || 'Difficulty not provided'}</Badge>
            </div>
            <div className="mb-4 break-words text-base font-medium leading-7 text-ink-heading"><MathText text={question.question} /></div>
            <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <legend className="mb-2 text-xs font-medium text-ink-muted">Choose an answer</legend>
              {question.options.map((option, index) => {
                const selected = selectedOption === String(index)
                const isCorrect = showAnswer && index === question.correctOptionIndex
                return (
                  <label key={`${question.id}-choice-${index}`} className={`flex min-h-11 min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-6 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${isCorrect ? 'border-success-border bg-success-bg' : selected ? 'border-option-selected-border bg-option-selected' : 'border-line hover:bg-canvas-muted'}`}>
                    <input className="sr-only" type="radio" name={`featured-${question.id}`} checked={selected} onChange={() => setSelectedOption(String(index))} />
                    <span className="font-semibold text-ink-muted">{String.fromCharCode(65 + index)}.</span>
                    <span className="min-w-0 break-words text-ink"><MathText text={option} /></span>
                  </label>
                )
              })}
            </fieldset>
            {showAnswer && <div className="mt-4 rounded-lg border border-success-border bg-success-bg p-3 text-sm leading-6 text-ink" role="region" aria-label="Answer and explanation">
              <p className="mb-1 font-semibold text-ink-heading">Answer: <MathText text={question.correctAnswer || 'Not provided'} /></p>
              <MathText text={question.explanation || 'No explanation is available.'} />
            </div>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setShowAnswer((current) => !current)} aria-expanded={showAnswer}>
                {showAnswer ? 'Hide answer' : 'View answer'} {showAnswer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line-strong px-4 text-sm font-medium text-ink-heading hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setToast('Bookmarks are not available yet. This question was not saved.')}>
                <Bookmark size={16} aria-hidden="true" /> Save question
              </button>
            </div>
          </>
        )}
      </article>
      <Toast message={toast} onDismiss={() => setToast('')} />
    </>
  )
}
