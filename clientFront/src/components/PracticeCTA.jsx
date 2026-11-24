import { Link } from 'react-router-dom'
import { BookOpenCheck, ClipboardList } from 'lucide-react'
import Button from './ui/Button'
import Container from './ui/Container'

const cardClass = 'flex flex-col items-center rounded-xl border px-6 py-10 text-center'

export default function PracticeCTA() {
  return (
    <section className="pb-16 pt-8">
      <Container>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={`${cardClass} border-neutral-800 bg-black text-white`}>
            <ClipboardList size={24} className="mb-4" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold">Ready to take a test?</h2>
            <p className="mb-5 max-w-md text-sm leading-6 text-neutral-300">
              NIMCET is all about time management with Highly Focused reasoning. Take timed NIMCET practice tests, build your exam pacing, and review your results after submitting.
            </p>
            <Button as={Link} to="/tests" size="lg" variant="inverse" className="mt-auto">Practice Timed Tests</Button>
          </div>
          <div className={`${cardClass} border-line bg-surface`}>
            <BookOpenCheck size={24} className="mb-4 text-ink-muted" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold text-ink-heading">Ready to practice?</h2>
            <p className="mb-5 max-w-md text-sm leading-6 text-ink-muted">
              Browse published questions, check answer keys, and read the explanations available in the question bank.
            </p>
            <Button as={Link} to="/questions" size="lg" variant="secondary" className="mt-auto">Open Question Bank</Button>
          </div>
        </div>
      </Container>
    </section>
  )
}
