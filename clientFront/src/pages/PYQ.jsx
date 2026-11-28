import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList, LibraryBig } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { cn } from '../lib/cn'
import PYQQuestions from '../components/pyq/PYQQuestions'
import PYQTests from '../components/pyq/PYQTests'
import { TestCatalogIntro, TestCatalogRefresh } from '../components/tests/TestCatalogUI'

export default function PYQ() {
  const [params, setParams] = useSearchParams()
  const [catalogRevision, setCatalogRevision] = useState(0)
  const showTests = params.get('view') === 'tests'

  function viewLink(tests) {
    const next = new URLSearchParams(params)
    if (tests) next.set('view', 'tests')
    else next.delete('view')
    return { pathname: '/pyq', search: next.toString() }
  }

  function updateParams(values) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(values)) {
      if (value) next.set(name, value)
      else next.delete(name)
    }
    setParams(next)
  }

  const sections = [
    { tests: false, label: 'All PYQ questions', Icon: LibraryBig },
    { tests: true, label: 'FREE PYQ tests', Icon: ClipboardList },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <main className={cn('mx-auto w-full max-w-6xl flex-1 px-5 pb-14 md:px-8', showTests ? 'pt-10 md:pt-14' : 'pt-9 md:pt-12')}>
        {showTests ? <TestCatalogIntro title="NIMCET PYQ tests"
          description="Take previous NIMCET papers with their marking schemes." />
          : <header>
            <h1 className="text-3xl font-bold tracking-tight text-ink-heading md:text-4xl">NIMCET previous-year questions (PYQs)</h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">Find past NIMCET questions by exam year, subject and topic. Practise individual questions or take an available past paper as a free timed test.</p>
          </header>}
        <nav className={cn('flex flex-wrap items-center gap-2', showTests ? 'mt-10' : 'mb-7 mt-6 border-b border-line pb-3')} aria-label="PYQ sections">
          {sections.map(({ tests, label, Icon }) => (
            <Link key={label} to={viewLink(tests)} aria-current={showTests === tests ? 'page' : undefined}
              className={cn('inline-flex min-h-10 items-center gap-2 border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-4',
                showTests ? 'rounded-full font-medium' : 'rounded-md font-semibold',
                showTests === tests ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink-muted hover:bg-canvas-muted hover:text-ink-heading')}>
              <Icon size={16} aria-hidden="true" />{label}
            </Link>
          ))}
          {showTests && <TestCatalogRefresh onClick={() => setCatalogRevision(value => value + 1)} />}
        </nav>
        {showTests ? <PYQTests key={catalogRevision} params={params} updateParams={updateParams} /> : <PYQQuestions params={params} updateParams={updateParams} />}
        <section className="mt-10 border-t border-line pt-5" aria-labelledby="pyq-practice-heading">
          <h2 id="pyq-practice-heading" className="text-lg font-semibold text-ink-heading">How to use NIMCET PYQs</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
            Use a past paper to see which topics cost you marks. Check those topics against the revised syllabus in the <Link to="/about-nimcet" className="font-semibold text-accent underline underline-offset-4">NIMCET exam guide</Link>,
            then practise similar questions in the <Link to="/questions" className="font-semibold text-accent underline underline-offset-4">question bank</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
