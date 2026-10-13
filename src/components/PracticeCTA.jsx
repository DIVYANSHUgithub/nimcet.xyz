import { Link } from 'react-router-dom'
import { BookOpenCheck } from 'lucide-react'
import Container from './ui/Container'

export default function PracticeCTA() {
  return (
    <section className="pb-16 pt-8">
      <Container>
        <div className="flex flex-col items-center rounded-xl border border-line bg-surface px-6 py-10 text-center">
          <BookOpenCheck size={24} className="mb-4 text-ink-muted" aria-hidden="true" />
          <h2 className="mb-2 text-lg font-semibold text-ink-heading">Ready to practice?</h2>
          <p className="mb-5 max-w-md text-sm leading-6 text-ink-muted">Browse published questions, check answer keys, and read the explanations available in the question bank.</p>
          <Link to="/questions" className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Open Question Bank</Link>
        </div>
      </Container>
    </section>
  )
}
