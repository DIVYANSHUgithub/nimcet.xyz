import { ArrowRight, Clock3, FileQuestion, LockKeyhole, RefreshCw, ShieldCheck, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours} hr${hours === 1 ? '' : 's'}${minutes % 60 ? ` ${minutes % 60} min` : ''}` : `${minutes} min`
}

function scheduleState(test, allowResumeOutsideWindow) {
  const active = Boolean(test.active_attempt_id)
  const resume = { label: 'Continue attempt', resume: true }
  if (active && allowResumeOutsideWindow) return resume

  const now = new Date()
  const start = test.available_from ? new Date(test.available_from) : null
  const end = test.available_until ? new Date(test.available_until) : null
  if (start && start > now) return { label: `Opens ${start.toLocaleString()}`, disabled: true }
  if (end && end <= now) return { label: 'Closed', disabled: true }
  if (active) return resume
  if (test.attempts_used >= test.attempt_limit) return { label: 'Attempts used', disabled: true }
  return { label: 'Start test' }
}

export function TestCatalogIntro({ title, description, eyebrow, timing = 'Timed, server-controlled sessions' }) {
  return (
    <>
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
          <h1 className="text-3xl font-bold tracking-tight text-ink-heading md:text-4xl">{title}</h1>
          <p className="mt-3 text-base leading-7 text-ink-muted">{description}</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted shadow-card">
          <ShieldCheck size={19} className="shrink-0 text-success" aria-hidden="true" />
          <span>Answer keys stay hidden during every attempt.</span>
        </div>
      </div>

      <div className="mt-8 grid gap-3 rounded-2xl bg-brand px-5 py-5 text-on-brand sm:grid-cols-3 sm:px-7">
        <div className="flex items-center gap-3"><Clock3 size={19} aria-hidden="true" /><span className="text-sm text-on-brand/85">{timing}</span></div>
        <div className="flex items-center gap-3"><FileQuestion size={19} aria-hidden="true" /><span className="text-sm text-on-brand/85">Autosaved answer progress</span></div>
        <div className="flex items-center gap-3"><Trophy size={19} aria-hidden="true" /><span className="text-sm text-on-brand/85">Review your result when released</span></div>
      </div>
    </>
  )
}

export function TestCatalogRefresh({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink-muted hover:bg-canvas-muted hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" aria-label="Refresh tests">
      <RefreshCw size={15} aria-hidden="true" /> Refresh
    </button>
  )
}

export function TestCatalogGrid({ loading = false, children }) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label={loading ? 'Loading tests' : undefined} aria-busy={loading || undefined}>
      {loading ? Array.from({ length: 6 }, (_, index) => <div key={index} className="h-60 animate-pulse rounded-2xl border border-line bg-canvas-muted" />) : children}
    </div>
  )
}

export function TestCatalogCard({ test, category, signedIn, signIn, busy, opening, onOpen, allowResumeOutsideWindow = false, children }) {
  const state = scheduleState(test, allowResumeOutsideWindow)
  const attempts = Math.max(0, test.attempt_limit - test.attempts_used)
  const availability = signedIn ? `${attempts} attempt${attempts === 1 ? '' : 's'} available` : 'Open'

  return (
    <article className="flex min-h-64 min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-raised">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="rounded-full bg-canvas-subtle px-3 py-1 text-xs font-semibold text-ink-muted">{category}</span>
        <span className="text-xs font-medium text-ink-muted">{test.pass_required ? 'Student Pass' : test.examination_code}</span>
      </div>
      <h2 className="mt-4 text-lg font-semibold leading-6 text-ink-heading">{test.title}</h2>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><FileQuestion size={15} aria-hidden="true" />{test.question_count} question{test.question_count === 1 ? '' : 's'}</span>
        <span className="inline-flex items-center gap-1.5"><Clock3 size={15} aria-hidden="true" />{formatDuration(test.duration_seconds)}</span>
      </div>
      {children}
      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <span className={`min-w-0 break-words text-xs font-medium ${state.disabled ? 'text-ink-muted' : state.resume ? 'text-accent' : 'text-success'}`}>
            {test.locked ? <span className="inline-flex items-center gap-1"><LockKeyhole size={14} aria-hidden="true" /> Pass required</span>
              : state.resume ? 'Attempt in progress' : state.disabled ? state.label : availability}
          </span>
          {test.locked ? <Button as={Link} size="sm" to="/student-pass">Buy Pass <ArrowRight size={15} aria-hidden="true" /></Button>
            : !signedIn && !state.disabled
            ? <Button as={Link} size="sm" to={signIn}>Sign in to start <ArrowRight size={15} aria-hidden="true" /></Button>
            : <Button size="sm" className="max-w-full whitespace-normal text-left" disabled={state.disabled || busy} onClick={onOpen}>
              {opening ? 'Opening…' : state.label} <ArrowRight className="shrink-0" size={15} aria-hidden="true" />
            </Button>}
        </div>
      </div>
    </article>
  )
}
