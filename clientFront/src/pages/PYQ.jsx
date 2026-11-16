import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Button from '../components/ui/Button'
import { backendGet, backendRequest } from '../lib/backendApi'
import { useAuth } from '../context/useAuth'

export default function PYQ() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [exam, setExam] = useState('')
  const [year, setYear] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [request, setRequest] = useState({ key: '', items: [], total: 0, has_more: false, error: '' })
  const [starting, setStarting] = useState('')
  const [startError, setStartError] = useState('')
  const key = JSON.stringify([exam, year, page, revision, user?.id])
  useEffect(() => {
    if (!user) return undefined
    const controller = new AbortController()
    backendGet('pyq/papers', { params: { exam, year, page }, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setRequest({ ...data, key, error: '' }) })
      .catch(error => { if (!controller.signal.aborted) setRequest({ key, items: [], total: 0, has_more: false, error: error.message }) })
    return () => controller.abort()
  }, [exam, year, page, key, user])
  const loading = request.key !== key
  async function start(paper) {
    if (paper.active_attempt_id) { navigate(`/attempts/${paper.active_attempt_id}`); return }
    setStarting(paper.test_version_id); setStartError('')
    try {
      const session = await backendRequest(`pyq/papers/${paper.test_version_id}/attempts`, { method: 'POST' })
      navigate(`/attempts/${session.attempt_id}`)
    } catch (error) { setStartError(error.message) } finally { setStarting('') }
  }
  return <div className="flex min-h-svh flex-col bg-canvas"><Navbar />
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-9 md:px-8">
      <h1 className="text-3xl font-bold text-ink-heading">Previous-year questions</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">Practice individual questions or take a verified complete paper with its original ordering and marking scheme.</p>
      <section className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink-heading">All PYQ questions</h2>
        <p className="my-3 text-sm text-ink-muted">Filter by examination, year, subject, topic and subtopic. Answer a question to see its solution.</p>
        <Button as={Link} to="/questions?pyq=true">Practice PYQ questions</Button>
      </section>
      <section className="mt-8" aria-label="Year-wise PYQ papers">
        <h2 className="text-xl font-semibold text-ink-heading">Year-wise papers</h2>
        <p className="mt-2 text-sm text-ink-muted">Only approved complete papers are listed. Your attempts and results remain private.</p>
        <div className="my-5 flex flex-wrap gap-4">
          <label>Examination<input className="ml-2 rounded border border-line p-2" value={exam} maxLength={80} onChange={e => { setExam(e.target.value); setPage(1) }} /></label>
          <label>Year<input className="ml-2 w-28 rounded border border-line p-2" type="number" min="1900" max="2200" value={year} onChange={e => { setYear(e.target.value); setPage(1) }} /></label>
        </div>
        {authLoading ? <p role="status">Checking sign-in…</p> : !user ? <Button as={Link} to="/login" state={{ from: '/pyq' }}>Sign in to view papers</Button> : loading ? <p role="status">Loading published papers…</p> : request.error ? <div role="alert"><p>{request.error}</p><Button onClick={() => setRevision(r => r + 1)}>Try again</Button></div> : request.items.length === 0 ? <p className="rounded-xl border border-dashed border-line p-6">No verified complete papers match these filters yet.</p> : <>
          {startError && <p role="alert" className="mb-4 text-danger">{startError}</p>}
          <div className="grid gap-5 md:grid-cols-2">{request.items.map(paper => <article key={paper.test_version_id} className="rounded-xl border border-line bg-surface p-5">
            <p className="text-sm font-semibold text-accent">{paper.examination_code} · {paper.year}</p>
            <h3 className="mt-2 text-lg font-semibold text-ink-heading">{paper.title}</h3>
            <p className="my-3 text-sm text-ink-muted">{Math.ceil(paper.duration_seconds / 60)} minutes · {paper.attempts_used} / {paper.attempt_limit} attempts used</p>
            <ul className="mb-3 space-y-1 text-sm">{paper.metadata.sections.map(section => <li key={section.code}>{section.code}: {section.question_count} questions, +{section.marks} / −{section.negative_marks}</li>)}</ul>
            <p className="mb-4 text-xs text-ink-muted">{paper.metadata.paper.source_citation || 'Verified source'}{paper.metadata.paper.source_url && <> · <a className="underline" href={paper.metadata.paper.source_url} target="_blank" rel="noreferrer">View source</a></>}</p>
            <p className="mb-4 text-xs text-ink-muted">{paper.available_from && <>Opens {new Date(paper.available_from).toLocaleString()}. </>}{paper.available_until && <>Closes {new Date(paper.available_until).toLocaleString()}.</>}</p>
            <Button disabled={Boolean(starting) || (!paper.active_attempt_id && paper.attempts_used >= paper.attempt_limit)} onClick={() => start(paper)}>{starting === paper.test_version_id ? 'Starting…' : paper.active_attempt_id ? 'Resume paper' : 'Start paper'}</Button>
          </article>)}</div>
          <div className="mt-5 flex items-center gap-4"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page} · {request.total} papers</span><Button variant="secondary" disabled={!request.has_more} onClick={() => setPage(p => p + 1)}>Next</Button></div>
        </>}
      </section>
    </main><Footer /></div>
}
