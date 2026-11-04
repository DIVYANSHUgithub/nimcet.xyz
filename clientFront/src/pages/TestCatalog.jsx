import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Clock3, FileQuestion, RefreshCw, ShieldCheck, Trophy } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Button from '../components/ui/Button'
import { useAuth } from '../context/useAuth'
import { ApiRequestError } from '../lib/backendApi'
import { getAttempt, listTests, startTest } from '../lib/testsApi'

const KIND_LABELS = {
  full_length: 'Full-length',
  section: 'Sectional',
  subject: 'Subject practice',
  custom: 'Practice test',
  pyq: 'Previous year',
  daily: 'Daily practice',
}

function friendlyError(error) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return 'Sign in to view and take tests.'
    if (error.status === 403) return 'Test access is not enabled for this account yet.'
    if (error.status === 404 && error.code === 'http_error') return 'The test service is not enabled for this deployment yet. Please try again later.'
    if (error.status === 404) return 'This test is no longer available.'
    if (error.status === 503) return 'The test service is temporarily unavailable. Please retry in a moment.'
    if (error.status === 409) return 'An attempt is already active. Resume it to continue.'
  }
  return error?.message || 'Tests could not be loaded. Please try again.'
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours} hr${hours === 1 ? '' : 's'}${minutes % 60 ? ` ${minutes % 60} min` : ''}` : `${minutes} min`
}

function scheduleState(test, now) {
  const start = test.available_from ? new Date(test.available_from) : null
  const end = test.available_until ? new Date(test.available_until) : null
  if (start && start > now) return { label: `Opens ${start.toLocaleString()}`, disabled: true }
  if (end && end <= now) return { label: 'Closed', disabled: true }
  if (test.attempts_used >= test.attempt_limit && !test.active_attempt_id) return { label: 'Attempts used', disabled: true }
  if (test.active_attempt_id) return { label: 'Continue attempt', disabled: false, resume: true }
  return { label: 'Start test', disabled: false }
}

export default function TestCatalog() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [response, setResponse] = useState({ items: [], page: 1, page_size: 12, total: 0, has_more: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startingId, setStartingId] = useState('')
  const [filter, setFilter] = useState('all')
  const [revision, setRevision] = useState(0)

  const load = useCallback((signal) => {
    setLoading(true)
    listTests({ page: response.page, pageSize: response.page_size, signal })
      .then((data) => {
        setResponse((previous) => data.page > 1
          ? { ...data, items: [...previous.items, ...data.items] }
          : data)
        setError('')
      })
      .catch((reason) => {
        if (reason?.name === 'AbortError' || signal?.aborted) return
        setError(friendlyError(reason))
      })
      .finally(() => { if (!signal?.aborted) setLoading(false) })
  }, [response.page, response.page_size])

  useEffect(() => {
    if (authLoading) return undefined
    if (!user) return undefined
    const controller = new AbortController()
    const schedule = window.setTimeout(() => load(controller.signal), 0)
    return () => {
      window.clearTimeout(schedule)
      controller.abort()
    }
  }, [authLoading, user, load, revision])

  const categories = useMemo(() => ['all', ...new Set(response.items.map((item) => item.kind))], [response.items])
  const visibleTests = filter === 'all' ? response.items : response.items.filter((item) => item.kind === filter)

  function refreshTests() {
    setResponse((current) => ({ ...current, page: 1, items: [] }))
    setRevision((value) => value + 1)
  }

  async function handleStart(test) {
    if (!user) {
      navigate('/login', { state: { from: '/tests' } })
      return
    }
    setStartingId(test.id)
    setError('')
    try {
      const session = test.active_attempt_id
        ? await getAttempt(test.active_attempt_id)
        : await startTest(test.id)
      navigate(`/attempts/${session.attempt_id}`)
    } catch (reason) {
      setError(friendlyError(reason))
      setStartingId('')
      setRevision((value) => value + 1)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-10 md:px-8 md:pt-14">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Practice with purpose</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-heading md:text-4xl">Tests & mock exams</h1>
            <p className="mt-3 text-base leading-7 text-ink-muted">Build confidence with timed NIMCET practice. Your answers save as you go, so you can safely resume an active attempt.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted shadow-card">
            <ShieldCheck size={19} className="shrink-0 text-success" aria-hidden="true" />
            <span>Answer keys stay hidden during every attempt.</span>
          </div>
        </div>

        <div className="mt-8 grid gap-3 rounded-2xl bg-brand px-5 py-5 text-white sm:grid-cols-3 sm:px-7">
          <div className="flex items-center gap-3"><Clock3 size={19} /><span className="text-sm text-white/85">Timed, server-controlled sessions</span></div>
          <div className="flex items-center gap-3"><FileQuestion size={19} /><span className="text-sm text-white/85">Autosaved answer progress</span></div>
          <div className="flex items-center gap-3"><Trophy size={19} /><span className="text-sm text-white/85">Review your result when released</span></div>
        </div>

        {!authLoading && !user && (
          <section className="mt-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-info-border bg-info-bg p-5 sm:flex-row sm:items-center">
            <div><h2 className="font-semibold text-ink-heading">Sign in to browse and take tests</h2><p className="mt-1 text-sm text-ink-muted">Your test list, active attempts, and saved answers are tied to your account.</p></div>
            <Button as={Link} to="/login" state={{ from: '/tests' }}>Sign in <ArrowRight size={16} /></Button>
          </section>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-2" aria-label="Filter tests by type">
          {categories.map((category) => (
            <button key={category} type="button" onClick={() => setFilter(category)} className={`min-h-10 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${filter === category ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink-muted hover:bg-canvas-muted hover:text-ink-heading'}`} aria-pressed={filter === category}>
              {category === 'all' ? 'All tests' : KIND_LABELS[category] || category}
            </button>
          ))}
          <button type="button" onClick={refreshTests} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink-muted hover:bg-canvas-muted hover:text-ink-heading" aria-label="Refresh tests"><RefreshCw size={15} /> Refresh</button>
        </div>

        {error && <div className="mt-5 flex flex-col gap-3 rounded-xl border border-danger-border bg-danger-bg p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between" role="alert"><span>{error}</span><Button size="sm" variant="secondary" onClick={refreshTests}>Try again</Button></div>}

        {!user && !authLoading ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-canvas-muted px-6 py-14 text-center"><FileQuestion size={30} className="mx-auto text-ink-muted" /><h2 className="mt-4 text-lg font-semibold text-ink-heading">Sign in to see available tests</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">Published tests and active attempts are available to your signed-in account.</p></div>
        ) : loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading tests" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-60 animate-pulse rounded-2xl border border-line bg-canvas-muted" />)}</div>
        ) : visibleTests.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleTests.map((test) => {
              const state = scheduleState(test, new Date())
              const actionLabel = startingId === test.id ? 'Opening…' : state.label
              return (
                <article key={test.id} className="flex min-h-64 flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-raised">
                  <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-canvas-subtle px-3 py-1 text-xs font-semibold text-ink-muted">{KIND_LABELS[test.kind] || test.kind}</span><span className="text-xs font-medium text-ink-muted">{test.examination_code}</span></div>
                  <h2 className="mt-4 text-lg font-semibold leading-6 text-ink-heading">{test.title}</h2>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted"><span className="inline-flex items-center gap-1.5"><FileQuestion size={15} />{test.question_count} questions</span><span className="inline-flex items-center gap-1.5"><Clock3 size={15} />{formatDuration(test.duration_seconds)}</span></div>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-5 mt-5"><span className={`text-xs font-medium ${state.disabled ? 'text-ink-muted' : state.resume ? 'text-accent' : 'text-success'}`}>{state.resume ? 'Attempt in progress' : state.disabled ? state.label : `${Math.max(0, test.attempt_limit - test.attempts_used)} attempt${test.attempt_limit - test.attempts_used === 1 ? '' : 's'} available`}</span><Button size="sm" disabled={state.disabled || startingId === test.id} onClick={() => handleStart(test)}>{actionLabel} <ArrowRight size={15} /></Button></div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-canvas-muted px-6 py-14 text-center"><FileQuestion size={30} className="mx-auto text-ink-muted" /><h2 className="mt-4 text-lg font-semibold text-ink-heading">No published tests yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">New mock exams and practice sets will appear here as they are published.</p><Button as={Link} to="/questions" variant="secondary" className="mt-5">Practice questions</Button></div>
        )}

        {response.has_more && <div className="mt-8 flex justify-center"><Button variant="secondary" disabled={loading} onClick={() => setResponse((current) => ({ ...current, page: current.page + 1 }))}>Load more tests</Button></div>}
      </main>
      <Footer />
    </div>
  )
}
