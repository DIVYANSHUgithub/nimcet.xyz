import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getMyAttempts, getMyTestDashboard } from '../lib/testsApi'
import { formatDisplayDate } from '../utils/formatDate'
import Button from './ui/Button'

function percentage(value) {
  return value == null ? '—' : `${Number(value).toFixed(1)}%`
}

function RecentAttempt({ attempt }) {
  const active = attempt.status === 'in_progress'
  const terminated = attempt.status === 'terminated'
  const date = attempt.submitted_at || attempt.started_at
  const outcome = active ? 'In progress' : terminated ? 'Terminated' : attempt.result_released
    ? `${Number(attempt.score).toFixed(2)} / ${Number(attempt.maximum_score).toFixed(2)}`
    : 'Score pending'

  return <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
    <div className="min-w-0">
      <p className="wrap-anywhere text-sm font-semibold text-ink-heading">{attempt.test_title}</p>
      <p className="mt-0.5 text-xs text-ink-muted"><time dateTime={date}>{formatDisplayDate(new Date(date))}</time> · {outcome}</p>
    </div>
    {!terminated && <Button as={Link} to={`/attempts/${attempt.attempt_id}${active ? '' : '/result'}`} size="sm" variant="ghost" aria-label={`${active ? 'Resume' : 'View result for'} ${attempt.test_title}`}>
      {active ? 'Resume' : 'View result'}
    </Button>}
  </li>
}

export default function ProfileProgress() {
  const [result, setResult] = useState(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    Promise.all([getMyTestDashboard({ signal }), getMyAttempts({ pageSize: 4, signal })])
      .then(([stats, history]) => {
        if (!signal.aborted) setResult({ stats, attempts: history.items })
      })
      .catch(error => {
        if (!signal.aborted) setResult({ error: error.status === 401
          ? 'Your session could not be verified. Sign in again to see your test progress.'
          : 'Test progress could not be loaded. Please try again.' })
      })
    return () => controller.abort()
  }, [revision])

  const stats = result?.stats
  const metrics = stats && [
    ['Completed', stats.completed_count],
    ['Average score', percentage(stats.average_percentage)],
    ['Best score', percentage(stats.best_percentage)],
  ]

  return <section className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="profile-progress">
    <div className="flex flex-wrap items-center justify-between gap-x-4">
      <h2 id="profile-progress" className="text-lg font-bold text-ink-heading">Test progress</h2>
      <Link to="/results" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-accent hover:underline">My results <ArrowRight size={14} aria-hidden="true" /></Link>
    </div>
    {!result && <p className="mt-4 text-sm text-ink-muted" role="status">Loading test progress…</p>}
    {result?.error && <div className="mt-4 rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger">
      <p role="alert">{result.error}</p>
      <Button size="sm" variant="secondary" className="mt-2" onClick={() => { setResult(null); setRevision(value => value + 1) }}>Try again</Button>
    </div>}
    {metrics && <>
      <dl className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {metrics.map(([label, value]) => <div className="flex min-w-0 flex-col justify-between rounded-lg bg-canvas-muted px-2.5 py-3 sm:px-4" key={label}>
          <dt className="text-xs font-medium text-ink-muted">{label}</dt>
          <dd className="mt-1 wrap-anywhere text-lg font-bold tabular-nums text-ink-heading sm:text-2xl">{value}</dd>
        </div>)}
      </dl>
      <p className="mt-2 text-xs text-ink-muted">Scores reflect released results.</p>
      <div className="mt-6 border-t border-line pt-4">
        <h3 className="text-sm font-semibold text-ink-heading">Recent attempts</h3>
        {result.attempts.length ? <ul className="mt-1 divide-y divide-line">
          {result.attempts.map(attempt => <RecentAttempt key={attempt.attempt_id} attempt={attempt} />)}
        </ul> : <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-line-strong p-3">
          <p className="text-sm text-ink-muted">No test attempts yet.</p>
          <Button as={Link} to="/tests" size="sm" variant="secondary">Find a test</Button>
        </div>}
      </div>
    </>}
  </section>
}
