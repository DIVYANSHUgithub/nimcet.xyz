import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock3, Eye, FileQuestion, LockKeyhole, Trophy } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import MathText from '../components/MathText'
import Button from '../components/ui/Button'
import { ApiRequestError } from '../lib/backendApi'
import { getAttemptResult, getAttemptReview } from '../lib/testsApi'

function percentage(score, maximum) {
  const max = Number(maximum)
  if (!max) return 0
  return Number(score) / max * 100
}

function number(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value))
}

export default function AttemptResult() {
  const { attemptId } = useParams()
  const [result, setResult] = useState(null)
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewError, setReviewError] = useState('')

  const load = useCallback((signal) => {
    setLoading(true)
    getAttemptResult(attemptId, { signal }).then((data) => {
      setResult(data)
      setError('')
    }).catch((reason) => {
      if (reason?.name === 'AbortError' || signal?.aborted) return
      setError(reason instanceof ApiRequestError && reason.status === 401
        ? 'Sign in to view this attempt result.'
        : 'This result is not available yet, or the attempt could not be found.')
    }).finally(() => { if (!signal?.aborted) setLoading(false) })
  }, [attemptId])

  useEffect(() => {
    const controller = new AbortController()
    const schedule = window.setTimeout(() => load(controller.signal), 0)
    return () => { window.clearTimeout(schedule); controller.abort() }
  }, [load])

  async function showReview() {
    setReviewLoading(true)
    setReviewError('')
    try {
      const data = await getAttemptReview(attemptId)
      setReview(data)
    } catch (reason) {
      setReviewError(reason instanceof ApiRequestError && reason.status === 401
        ? 'Sign in to view answer review.'
        : 'Answer review is not released yet.')
    } finally {
      setReviewLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 md:px-8 md:py-12">
        <Link to="/results" className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink-heading"><ArrowLeft size={16} /> My results</Link>
        {loading ? <div className="mt-6 rounded-2xl border border-line bg-surface p-8 text-sm text-ink-muted" role="status">Loading your result…</div> : error ? (
          <section className="mt-6 rounded-2xl border border-warning-border bg-warning-bg p-6" role="status">
            <div className="flex items-start gap-3"><LockKeyhole size={21} className="mt-0.5 shrink-0 text-warning" /><div><h1 className="font-semibold text-ink-heading">Result unavailable</h1><p className="mt-1 text-sm leading-6 text-ink-muted">{error}</p></div></div>
            <div className="mt-5 flex gap-3"><Button variant="secondary" onClick={() => load()}>Check again</Button><Button as={Link} to="/tests">Browse tests</Button></div>
          </section>
        ) : result && (
          <>
            <section className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-9">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-accent">Attempt result</p><h1 className="mt-2 text-2xl font-bold text-ink-heading sm:text-3xl">{result.test_title}</h1><p className="mt-2 text-sm text-ink-muted">Submitted {new Date(result.submitted_at).toLocaleString()}</p></div>
                <div className="rounded-2xl bg-canvas-subtle px-6 py-4 sm:min-w-44 sm:text-right"><p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Score</p><p className="mt-1 text-3xl font-bold tabular-nums text-ink-heading">{number(result.score)}<span className="text-base font-medium text-ink-muted"> / {number(result.maximum_score)}</span></p><p className="mt-1 text-sm font-semibold text-accent">{percentage(result.score, result.maximum_score).toFixed(1)}%</p></div>
              </div>
              <div className="mt-7 grid grid-cols-3 gap-3 sm:gap-4">
                <div className="rounded-xl border border-success-border bg-success-bg p-4"><CheckCircle2 size={18} className="text-success" /><p className="mt-3 text-2xl font-bold text-success">{result.correct_count}</p><p className="text-xs text-ink-muted">Correct</p></div>
                <div className="rounded-xl border border-danger-border bg-danger-bg p-4"><FileQuestion size={18} className="text-danger" /><p className="mt-3 text-2xl font-bold text-danger">{result.incorrect_count}</p><p className="text-xs text-ink-muted">Incorrect</p></div>
                <div className="rounded-xl border border-line bg-canvas-muted p-4"><Clock3 size={18} className="text-ink-muted" /><p className="mt-3 text-2xl font-bold text-ink-heading">{result.unanswered_count}</p><p className="text-xs text-ink-muted">Unanswered</p></div>
              </div>
              {result.sections.length > 0 && <div className="mt-8"><h2 className="text-lg font-semibold text-ink-heading">Section performance</h2><div className="mt-3 divide-y divide-line rounded-xl border border-line">{result.sections.map((section) => { const scorePct = Math.max(0, Math.min(100, percentage(section.score, section.maximum_score))); return <div key={section.section_id} className="p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-medium text-ink-heading">{section.title}</h3><span className="shrink-0 text-sm font-semibold tabular-nums text-ink-heading">{number(section.score)} / {number(section.maximum_score)}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas-subtle"><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${scorePct}%` }} /></div><p className="mt-2 text-xs text-ink-muted">{section.correct_count} correct · {section.incorrect_count} incorrect · {section.unanswered_count} unanswered</p></div> })}</div></div>}
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"><p className="text-xs text-ink-muted">Score released {new Date(result.released_at).toLocaleString()}</p>{result.review_released ? <Button onClick={showReview} disabled={reviewLoading}><Eye size={16} />{reviewLoading ? 'Loading review…' : review ? 'Refresh answer review' : 'Review answers'}</Button> : <span className="inline-flex items-center gap-2 text-sm text-ink-muted"><LockKeyhole size={15} />Answer review is not released yet</span>}</div>
            </section>

            {reviewError && <div className="mt-4 rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning" role="status">{reviewError}</div>}
            {review && <section className="mt-7" aria-label="Answer review"><div className="mb-4 flex items-center gap-2"><Trophy size={18} className="text-accent" /><h2 className="text-xl font-bold text-ink-heading">Answer review</h2></div><div className="space-y-4">{review.questions.map((question) => <article key={question.display_order} className="rounded-2xl border border-line bg-surface p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Question {question.display_order + 1} · {question.section_title}</span><span className={`text-xs font-semibold ${question.is_correct ? 'text-success' : question.selected_option_id ? 'text-danger' : 'text-ink-muted'}`}>{question.is_correct ? `Correct · +${number(question.marks_awarded)}` : question.selected_option_id ? `Incorrect · ${number(question.marks_awarded)}` : 'Unanswered'}</span></div><div className="mt-4 text-base font-medium leading-7 text-ink-heading"><MathText text={question.question} /></div><div className="mt-4 grid gap-2">{question.options.map((option, index) => { const isCorrect = option.id === question.correct_option_id; const selected = option.id === question.selected_option_id; return <div key={option.id} className={`flex items-start gap-3 rounded-lg border p-3 ${isCorrect ? 'border-success-border bg-success-bg' : selected ? 'border-danger-border bg-danger-bg' : 'border-line bg-surface'}`}><span className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold">{String.fromCharCode(65 + index)}</span><div className="flex-1 text-sm leading-6 text-ink"><MathText text={typeof option.content === 'string' ? option.content : JSON.stringify(option.content)} /></div><span className="shrink-0 text-xs font-semibold">{isCorrect ? 'Correct answer' : selected ? 'Your answer' : ''}</span></div> })}</div>{question.explanation && <div className="mt-4 rounded-lg bg-canvas-muted p-4"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Explanation</p><div className="text-sm leading-6 text-ink"><MathText text={question.explanation} /></div></div>}</article>)}</div></section>}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
