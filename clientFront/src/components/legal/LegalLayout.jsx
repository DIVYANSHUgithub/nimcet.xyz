import { Link } from 'react-router-dom'
import PageShell from '../ui/PageShell'
import { legalDetails, legalLinks } from '../../lib/legal'

export default function LegalLayout({ path, intro, sections, children }) {
  const page = legalLinks.find(link => link.to === path)
  return (
    <PageShell>
      <meta name="description" content={page.description} />
      <link rel="canonical" href={`${legalDetails.origin}${path}`} />
      <main id="main-content" tabIndex={-1} className="legal-page mx-auto w-full max-w-prose-wide px-5 py-10 md:px-8 md:py-14">
        <nav aria-label="Legal and support" className="mb-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {legalLinks.map(link => <Link key={link.to} to={link.to} aria-current={path === link.to ? 'page' : undefined}>{link.label}</Link>)}
        </nav>
        <header className="border-b border-line pb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">NIMCET.XYZ · Legal & support</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-heading sm:text-4xl">{page.label}</h1>
          <p className="mt-4 text-base leading-7">{intro}</p>
          <p className="mt-4 text-sm text-ink-muted">Last updated: <time dateTime={legalDetails.updated}>{legalDetails.updatedLabel}</time></p>
        </header>
        <nav aria-label="On this page" className="my-7 rounded-xl border border-line bg-canvas-muted p-5">
          <h2 className="font-semibold text-ink-heading">On this page</h2>
          <ol className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {sections.map(([id, title]) => <li key={id}><a href={`#${id}`}>{title}</a></li>)}
          </ol>
        </nav>
        <article className="legal-copy">{children}</article>
      </main>
    </PageShell>
  )
}
