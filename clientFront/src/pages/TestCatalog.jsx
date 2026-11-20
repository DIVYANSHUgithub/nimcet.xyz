import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authLinkTo } from '../lib/navigation'
import { FileQuestion } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { TestCatalogCard, TestCatalogGrid, TestCatalogIntro, TestCatalogRefresh } from '../components/tests/TestCatalogUI'
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
    if (error.status === 401) return 'Sign out and sign in again to take a test.'
    if (error.code === 'account_suspended') return 'Application access is suspended. Contact an administrator.'
    if (error.status === 403) {
      if (error.code === 'attempt_limit_reached') return 'You have used all attempts allowed for this test.'
      if (error.code === 'test_closed') return 'This test is closed.'
      if (error.code === 'test_not_started') return 'This test is not open yet.'
      if (error.code === 'test_has_no_questions') return 'This test has no questions available. Please contact the test administrator.'
      return 'Test access is not enabled for this account yet.'
    }
    if (error.status === 404 && error.code === 'http_error') return 'The test service is not enabled for this deployment yet. Please try again later.'
    if (error.status === 404) return 'This test is no longer available.'
    if (error.status === 503) return 'The test service is temporarily unavailable. Please retry in a moment.'
    if (error.status === 409) return 'An attempt is already active. Resume it to continue.'
  }
  return error?.message || 'Tests could not be loaded. Please try again.'
}

export default function TestCatalog() {
  const { user } = useAuth()
  return <TestCatalogPage key={user?.id ?? 'anonymous'} />
}

function TestCatalogPage() {
  const location = useLocation()
  const signIn = authLinkTo('/login', location)
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [response, setResponse] = useState({ items: [], page: 1, page_size: 12, total: 0, has_more: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startError, setStartError] = useState('')
  const [startingId, setStartingId] = useState('')
  const [filter, setFilter] = useState('all')
  const [revision, setRevision] = useState(0)

  const { page, page_size: pageSize } = response
  useEffect(() => {
    if (authLoading) return undefined
    const controller = new AbortController()
    const { signal } = controller
    const schedule = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await listTests({ page, pageSize, signal })
        if (signal.aborted) return
        setResponse(previous => data.page > 1
          ? { ...data, items: [...previous.items.slice(0, (data.page - 1) * data.page_size), ...data.items] }
          : data)
      } catch (reason) {
        if (!signal.aborted) setError(friendlyError(reason))
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }, 0)
    return () => {
      window.clearTimeout(schedule)
      controller.abort()
    }
  }, [authLoading, page, pageSize, revision])

  const categories = useMemo(() => ['all', ...new Set(response.items.map((item) => item.kind))], [response.items])
  const visibleTests = filter === 'all' ? response.items : response.items.filter((item) => item.kind === filter)
  const displayedError = startError || error

  function refreshTests() {
    setStartError('')
    setResponse((current) => ({ ...current, page: 1, items: [] }))
    setRevision((value) => value + 1)
  }

  async function handleStart(test) {
    if (authLoading) return
    if (!user) {
      navigate(signIn)
      return
    }
    setStartingId(test.id)
    setStartError('')
    setError('')
    try {
      const session = test.active_attempt_id
        ? await getAttempt(test.active_attempt_id)
        : await startTest(test.id)
      navigate(`/attempts/${session.attempt_id}`)
    } catch (reason) {
      setStartError(friendlyError(reason))
      setStartingId('')
      setRevision((value) => value + 1)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-10 md:px-8 md:pt-14">
        <TestCatalogIntro
          eyebrow="Practice with purpose"
          title="Tests & mock exams"
          description="Build confidence with timed NIMCET practice. Your answers save as you go, so you can safely resume an active attempt."
        />

        <div className="mt-10 flex flex-wrap items-center gap-2" aria-label="Filter tests by type">
          {categories.map((category) => (
            <button key={category} type="button" onClick={() => setFilter(category)} className={`min-h-10 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${filter === category ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink-muted hover:bg-canvas-muted hover:text-ink-heading'}`} aria-pressed={filter === category}>
              {category === 'all' ? 'All tests' : KIND_LABELS[category] || category}
            </button>
          ))}
          <TestCatalogRefresh onClick={refreshTests} />
        </div>

        {displayedError && <div className="mt-5 flex flex-col gap-3 rounded-xl border border-danger-border bg-danger-bg p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between" role="alert"><span>{displayedError}</span><Button size="sm" variant="secondary" onClick={refreshTests}>Try again</Button></div>}

        {authLoading || loading ? (
          <TestCatalogGrid loading />
        ) : error ? null : visibleTests.length ? (
          <TestCatalogGrid>
            {visibleTests.map(test => (
              <TestCatalogCard key={test.id} test={test} category={KIND_LABELS[test.kind] || test.kind}
                signedIn={Boolean(user)} signIn={signIn} busy={Boolean(startingId)}
                opening={startingId === test.id} onOpen={() => handleStart(test)} />
            ))}
          </TestCatalogGrid>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-canvas-muted px-6 py-14 text-center"><FileQuestion size={30} className="mx-auto text-ink-muted" /><h2 className="mt-4 text-lg font-semibold text-ink-heading">No published tests yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">New mock exams and practice sets will appear here as they are published.</p><Button as={Link} to="/questions" variant="secondary" className="mt-5">Practice questions</Button></div>
        )}

        {response.has_more && <div className="mt-8 flex justify-center"><Button variant="secondary" disabled={loading} onClick={() => setResponse((current) => ({ ...current, page: current.page + 1 }))}>Load more tests</Button></div>}
      </main>
      <Footer />
    </div>
  )
}
