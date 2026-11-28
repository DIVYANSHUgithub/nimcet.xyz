import PageShell from './ui/PageShell'

export const admissionsSite = 'https://nimcet.admissions.nic.in'
export const syllabus2026 = `${admissionsSite}/document/syllabus-2026/`
export const guideLink = 'font-semibold text-accent underline underline-offset-4'

export function ExamGuide({ title, summary, children }) {
  return (
    <PageShell>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-4xl px-5 pb-14 pt-10 sm:px-8 sm:pt-14">
        <header className="rounded-xl border border-info-border bg-info-bg px-5 py-7 sm:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink-heading sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-base text-ink">{summary}</p>
        </header>
        <div className="mt-8 space-y-8 text-base text-ink">{children}</div>
      </main>
    </PageShell>
  )
}

export function GuideSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-ink-heading sm:text-2xl">{title}</h2>
      {children}
    </section>
  )
}
