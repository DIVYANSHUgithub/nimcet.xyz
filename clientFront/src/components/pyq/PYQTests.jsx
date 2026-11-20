import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, FileQuestion } from 'lucide-react'
import Button from '../ui/Button'
import { TestCatalogCard, TestCatalogGrid } from '../tests/TestCatalogUI'
import { useAuth } from '../../context/useAuth'
import { backendGet, backendRequest } from '../../lib/backendApi'
import { authLinkTo } from '../../lib/navigation'

function PaperDetails({ paper }) {
  const { metadata } = paper
  const { source_citation: citation, source_url: source } = metadata.paper
  return (
    <details className="group mt-4 text-sm">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded text-sm font-medium text-ink-muted hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
        Paper details <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ul className="mt-3 space-y-3">
        {metadata.sections.map(section => {
          const groups = section.marking_groups ?? []
          const title = groups.length ? groups.map(group => group.title).join(' & ')
            : section.code.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
          const scheme = groups[0] ?? section
          return (
            <li key={section.code}>
              <p className="font-medium text-ink-heading">{title}</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                {section.question_count} questions{section.duration_seconds ? ` · ${Math.ceil(section.duration_seconds / 60)} min` : ''}
                {groups.length < 2 && ` · +${scheme.marks} / −${scheme.negative_marks}`}
              </p>
              {groups.length > 1 && <ul className="mt-1 space-y-0.5 text-xs leading-5 text-ink-muted">
                {groups.map((group, index) => <li key={index}>{group.title} · {group.question_count} questions · +{group.marks} / −{group.negative_marks}</li>)}
              </ul>}
            </li>
          )
        })}
      </ul>
      {(paper.available_from || paper.available_until) && <p className="mt-3 text-xs leading-5 text-ink-muted">
        {paper.available_from && <>Opens {new Date(paper.available_from).toLocaleString()}. </>}
        {paper.available_until && <>Closes {new Date(paper.available_until).toLocaleString()}.</>}
      </p>}
      {(citation || source) && <p className="mt-3 text-xs leading-5 text-ink-muted [overflow-wrap:anywhere]">
        {citation?.split(/(https?:\/\/[^\s<>]+)/).map((part, index) => index % 2
          ? <a key={index} className="underline" href={part} target="_blank" rel="noreferrer">Open cited document</a>
          : part)}
        {citation && source && ' · '}
        {source && <a className="underline" href={source} target="_blank" rel="noreferrer">View source</a>}
      </p>}
    </details>
  )
}

export default function PYQTests({ params, updateParams }) {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const signIn = authLinkTo('/login', location)
  const page = Math.max(1, parseInt(params.get('testPage'), 10) || 1)
  const [revision, setRevision] = useState(0)
  const [response, setResponse] = useState(null)
  const [starting, setStarting] = useState('')
  const [startError, setStartError] = useState('')
  const key = JSON.stringify([page, revision, user?.id])
  const current = !authLoading && response?.key === key ? response : null

  useEffect(() => {
    if (authLoading) return undefined
    const controller = new AbortController()
    backendGet('pyq/papers', { params: { page }, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setResponse({ key, data }) })
      .catch(error => { if (!controller.signal.aborted) setResponse({ key, error: error.message }) })
    return () => controller.abort()
  }, [authLoading, key, page])

  async function start(paper) {
    if (authLoading) return
    if (!user) {
      navigate(signIn)
      return
    }
    if (paper.active_attempt_id) {
      navigate(`/attempts/${paper.active_attempt_id}`)
      return
    }
    setStarting(paper.test_version_id)
    setStartError('')
    try {
      const session = await backendRequest(`pyq/papers/${paper.test_version_id}/attempts`, { method: 'POST' })
      navigate(`/attempts/${session.attempt_id}`)
    } catch (error) {
      const messages = {
        test_not_started: 'This PYQ test is not open yet.',
        test_closed: 'This PYQ test is closed.',
        attempt_limit_reached: 'You have used all attempts for this PYQ test.',
      }
      if (error.status === 401) {
        setStartError('Sign out and sign in again to start this PYQ test.')
        return
      }
      setStartError(messages[error.code] ?? error.message)
      setRevision(value => value + 1)
    } finally {
      setStarting('')
    }
  }

  const data = current?.data
  return (
    <section aria-label="Published PYQ tests">
      {startError && <p role="alert" className="mt-5 text-sm text-danger">{startError}</p>}
      {!current && <TestCatalogGrid loading />}
      {current?.error && <div role="alert" className="mt-5 flex flex-col gap-3 rounded-xl border border-danger-border bg-danger-bg p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
        <span>{current.error}</span>
        <Button size="sm" variant="secondary" onClick={() => setRevision(value => value + 1)}>Try again</Button>
      </div>}
      {data?.items.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-canvas-muted px-6 py-14 text-center">
        <FileQuestion size={30} className="mx-auto text-ink-muted" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-ink-heading">PYQ test not published</h2>
      </div>}
      {data?.items.length > 0 && <>
        <TestCatalogGrid>
          {data.items.map(paper => (
            <TestCatalogCard key={paper.test_version_id} category={`${paper.year} PYQ`}
              test={{ ...paper, question_count: paper.metadata.sections.reduce((count, section) => count + section.question_count, 0) }}
              signedIn={Boolean(user)} signIn={signIn} busy={Boolean(starting)} opening={starting === paper.test_version_id}
              onOpen={() => start(paper)} allowResumeOutsideWindow>
              <PaperDetails paper={paper} />
            </TestCatalogCard>
          ))}
        </TestCatalogGrid>
        {(data.has_more || data.page > 1) && <nav className="mt-5 flex flex-wrap items-center gap-3" aria-label="PYQ test pages">
          <Button variant="secondary" disabled={data.page === 1} onClick={() => updateParams({ testPage: data.page - 1 })}>Previous</Button>
          <span className="text-sm text-ink-muted">Page {data.page}</span>
          <Button variant="secondary" disabled={!data.has_more} onClick={() => updateParams({ testPage: data.page + 1 })}>Next</Button>
        </nav>}
      </>}
    </section>
  )
}
