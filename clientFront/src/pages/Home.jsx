import { ClipboardList, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import SectionHeader from '../components/SectionHeader'
import SubjectCard from '../components/SubjectCard'
import DailyQuestions from '../components/DailyQuestions'
import PracticeCTA from '../components/PracticeCTA'
import Footer from '../components/Footer'
import Button from '../components/ui/Button'
import Container from '../components/ui/Container'
import { useQuestionFacets } from '../hooks/useQuestionFacets'

function TestPromoCard({ id, title, description, to, buttonLabel, icon: Icon }) {
  return (
    <section aria-labelledby={id} className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-black p-3 text-white first:border-neutral-400 lg:gap-4 lg:px-5">
      <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 lg:inline-flex" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs leading-snug text-neutral-300 sm:text-sm">{description}</p>
      </div>
      <Button as={Link} to={to} size="sm" variant="inverse" className="min-h-11 shrink-0">{buttonLabel}</Button>
    </section>
  )
}

export default function Home() {
  const { subjects, topics } = useQuestionFacets()
  const featuredTopics = topics.slice(0, 9)
  const searchableItems = [
    ...topics.map((label) => ({ type: 'topic', label })),
    ...subjects.map(({ name }) => ({ type: 'subject', label: name })),
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero topics={featuredTopics} searchableItems={searchableItems} />
        <Container className="grid gap-2 pt-4 sm:pt-6 md:grid-cols-2 md:gap-3">
          <TestPromoCard
            id="home-pyq-tests-title"
            title="Previous-Year Papers"
            description="Take past NIMCET papers as free timed tests."
            to="/pyq?view=tests"
            buttonLabel="FREE PYQ TEST"
            icon={FileText}
          />
          <TestPromoCard
            id="home-tests-title"
            title="NIMCET Practice Tests"
            description="NIMCET is all about timed mock tests pratice."
            to="/tests"
            buttonLabel="Practice Tests"
            icon={ClipboardList}
          />
        </Container>
        <section className="py-14 sm:py-16">
          <Container>
            <SectionHeader title="Explore by Subject" subtitle="Browse published questions by subject." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
              {subjects.map((subject) => <SubjectCard key={subject.id} subject={subject} />)}
            </div>
          </Container>
        </section>
        <DailyQuestions />
        <PracticeCTA />
      </main>
      <Footer />
    </div>
  )
}
