import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, Clock3, FileCheck2, LockKeyhole, RefreshCw, Trophy } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Button from '../components/ui/Button'
import { useAuth } from '../context/useAuth'
import { ApiRequestError } from '../lib/backendApi'
import { getMyAttempts, getMyTestDashboard } from '../lib/testsApi'

const EMPTY_HISTORY = { items: [], page: 1, page_size: 20, total: 0, has_more: false }

function scoreLabel(score, maximum) {
  return `${Number(score).toFixed(2)} / ${Number(maximum).toFixed(2)}`
}

export default function StudentResults() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [history, setHistory] = useState(EMPTY_HISTORY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  const load = useCallback(async (signal) => {
    setLoading(true)
    try {
      const [stats, attempts] = await Promise.all([
        getMyTestDashboard({ signal }),
        getMyAttempts({ page: history.page, pageSize: history.page_size, signal }),
      ])
      setDashboard(stats)
      setHistory((previous) => attempts.page > 1
        ? { ...attempts, items: [...previous.items, ...attempts.items] }
        : attempts)
      setError('')
    } catch (reason) {
      if (reason?.name === 'AbortError' || signal?.aborted) return
      setError(reason?.status === 401
        ? 'Sign in to view your test history.'
        : reason instanceof ApiRequestError && reason.status === 404 && reason.code === 'http_error'
          ? 'The test service is not enabled for this deployment yet. Please try again later.'
          : reason instanceof ApiRequestError && reason.status === 503
            ? 'The test service is temporarily unavailable. Please retry in a moment.'
            : 'Your test history could not be loaded. Please retry.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [history.page, history.page_size])

  useEffect(() => {
    if (authLoading || !user) return undefined
    const controller = new AbortController()
    const timer = window.setTimeout(() => load(controller.signal), 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [authLoading, load, revision, user])

  function refresh() {
    setHistory((previous) => ({ ...previous, page: 1, items: [] }))
    setRevision((value) => value + 1)
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-accent">Your progress</p><h1 className="mt-2 text-3xl font-bold text-ink-heading">My test results</h1><p className="mt-2 text-sm text-ink-muted">Scores appear after their release time. Unreleased scores are excluded from averages.</p></div>
          <button type="button" onClick={refresh} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-muted hover:bg-canvas-muted" aria-label="Refresh results"><RefreshCw size={16} />Refresh</button>
        </div>

        {!authLoading && !user ? (
          <section className="mt-7 rounded-2xl border border-info-border bg-info-bg p-6"><h2 className="font-semibold text-ink-heading">Sign in to view your results</h2><p className="mt-1 text-sm text-ink-muted">Your attempt history is private to your account.</p><Button as={Link} to="/login" state={{ from: '/results' }} className="mt-4">Sign in</Button></section>
        ) : loading ? (
          <div className="mt-7 rounded-2xl border border-line bg-surface p-7 text-sm text-ink-muted" role="status">Loading your progress…</div>
        ) : error ? (
          <div className="mt-7 flex flex-col items-start justify-between gap-3 rounded-xl border border-danger-border bg-danger-bg p-5 sm:flex-row sm:items-center" role="alert"><p className="text-sm text-danger">{error}</p><Button size="sm" variant="secondary" onClick={refresh}>Try again</Button></div>
        ) : (
          <>
            <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Test performance summary">
              <Metric icon={FileCheck2} label="Attempts" value={dashboard?.attempts_count ?? 0} note={`${dashboard?.completed_count ?? 0} completed`} />
              <Metric icon={BarChart3} label="Results released" value={dashboard?.released_results_count ?? 0} note="Included in your performance" />
              <Metric icon={BarChart3} label="Average" value={dashboard?.average_percentage == null ? '—' : `${Number(dashboard.average_percentage).toFixed(1)}%`} note="Across released results" />
              <Metric icon={Trophy} label="Best" value={dashboard?.best_percentage == null ? '—' : `${Number(dashboard.best_percentage).toFixed(1)}%`} note="Highest released percentage" />
            </section>

            <section className="mt-9" aria-labelledby="attempt-history-title">
              <div className="mb-4 flex items-center justify-between"><h2 id="attempt-history-title" className="text-xl font-bold text-ink-heading">Attempt history</h2><span className="text-sm text-ink-muted">{history.total} total</span></div>
              {history.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line-strong bg-canvas-muted px-6 py-14 text-center"><Clock3 size={28} className="mx-auto text-ink-muted" /><h3 className="mt-4 font-semibold text-ink-heading">No test attempts yet</h3><p className="mt-2 text-sm text-ink-muted">Your completed tests and active attempts will be listed here.</p><Button as={Link} to="/tests" className="mt-5">Find a test <ArrowRight size={16} /></Button></div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-line bg-surface"><ul className="divide-y divide-line">
                  {history.items.map((attempt) => <li key={attempt.attempt_id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-ink-heading">{attempt.test_title}</h3><span className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${attempt.status === 'in_progress' ? 'bg-info-bg text-info' : 'bg-canvas-subtle text-ink-muted'}`}>{attempt.status === 'in_progress' ? 'In progress' : attempt.status === 'expired' ? 'Timer submitted' : attempt.status}</span></div><div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted"><span>Started {new Date(attempt.started_at).toLocaleString()}</span><span>{attempt.submitted_at ? `${Math.max(0, Math.floor((new Date(attempt.submitted_at) - new Date(attempt.started_at)) / 60000))} min` : 'In progress'}</span>{attempt.review_released && <span className="inline-flex items-center gap-1"><FileCheck2 size={12} />Review available</span>}</div></div>
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end"><div className="text-right"><p className="font-bold tabular-nums text-ink-heading">{attempt.result_released ? scoreLabel(attempt.score, attempt.maximum_score) : <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted"><LockKeyhole size={13} />Score pending</span>}</p>{attempt.result_released && <p className="mt-1 text-xs text-ink-muted">{Number(attempt.maximum_score) ? `${(Number(attempt.score) / Number(attempt.maximum_score) * 100).toFixed(1)}%` : ''}</p>}</div><Button size="sm" variant={attempt.status === 'in_progress' ? 'primary' : 'secondary'} onClick={() => navigate(attempt.status === 'in_progress' ? `/attempts/${attempt.attempt_id}` : `/attempts/${attempt.attempt_id}/result`)}>{attempt.status === 'in_progress' ? 'Resume' : 'View result'} <ArrowRight size={14} /></Button></div>
                  </li>)}
                </ul></div>
              )}
              {history.has_more && <div className="mt-5 flex justify-center"><Button variant="secondary" disabled={loading} onClick={() => setHistory((current) => ({ ...current, page: current.page + 1 }))}>Load more attempts</Button></div>}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function Metric({ icon: Icon, label, value, note }) {
  return <div className="rounded-2xl border border-line bg-surface p-5"><div className="flex items-center justify-between"><p className="text-sm text-ink-muted">{label}</p><Icon size={18} className="text-accent" /></div><p className="mt-3 text-3xl font-bold text-ink-heading">{value}</p><p className="mt-1 text-xs text-ink-muted">{note}</p></div>
}
