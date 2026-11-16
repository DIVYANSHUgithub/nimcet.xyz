import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { backendGet } from '../lib/backendApi'

const pct = value => value == null ? '—' : `${Number(value).toFixed(1)}%`

export default function PerformanceSummary() {
  const [request, setRequest] = useState({ data: null, error: '', loading: true })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    backendGet('students/me/performance', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setRequest({ data, error: '', loading: false }) })
      .catch(error => { if (!controller.signal.aborted) setRequest({ data: null, error: error.status === 503 ? 'Detailed performance summaries are not available yet.' : 'Unable to load your performance summary.', loading: false }) })
    return () => controller.abort()
  }, [revision])
  if (request.loading) return <p className="mt-6 text-sm text-ink-muted" role="status">Loading detailed performance…</p>
  if (request.error) return <div className="mt-6 text-sm text-ink-muted" role="status">{request.error} <button className="underline" onClick={() => setRevision(r => r + 1)}>Retry</button></div>
  const data = request.data
  return <section className="mt-8 rounded-xl border border-line bg-surface p-5" aria-label="Detailed performance">
    <h2 className="text-xl font-semibold text-ink-heading">Accuracy and section progress</h2>
    <p className="mt-2 text-sm text-ink-muted">Based on {data.released_attempts} released attempts. Accuracy counts correct answers among attempted questions; coverage counts correct answers among all questions.</p>
    <dl className="my-5 grid gap-3 sm:grid-cols-3"><div><dt>Accuracy</dt><dd className="text-xl font-semibold">{pct(data.accuracy_percentage)}</dd></div><div><dt>Correct answer coverage</dt><dd className="text-xl font-semibold">{pct(data.correct_percentage)}</dd></div><div><dt>Questions attempted</dt><dd className="text-xl font-semibold">{data.attempted_count} / {data.total_questions}</dd></div></dl>
    {data.sections.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-3 text-left font-semibold">Section totals across released results</caption><thead><tr><th className="p-2">Section</th><th className="p-2">Score</th><th className="p-2">Accuracy</th><th className="p-2">Unanswered</th></tr></thead><tbody>{data.sections.map(s => <tr className="border-t border-line" key={`${s.code}:${s.title}`}><th className="p-2 font-medium">{s.title}</th><td className="p-2">{Number(s.score).toFixed(2)} / {Number(s.maximum_score).toFixed(2)}</td><td className="p-2">{pct(s.accuracy_percentage)}</td><td className="p-2">{s.unanswered_count}</td></tr>)}</tbody></table></div>}
    {data.recent.length > 0 && <div className="mt-5"><h3 className="font-semibold">Recent released results</h3><ol className="mt-3 space-y-2">{data.recent.map(attempt => <li key={attempt.attempt_id} className="flex flex-wrap justify-between gap-2 border-t border-line py-2 text-sm"><Link className="underline" to={`/attempts/${attempt.attempt_id}/result`}>{new Date(attempt.submitted_at).toLocaleString()}</Link><span>{Number(attempt.score).toFixed(2)} / {Number(attempt.maximum_score).toFixed(2)} · accuracy {pct(attempt.accuracy_percentage)}</span></li>)}</ol></div>}
  </section>
}
