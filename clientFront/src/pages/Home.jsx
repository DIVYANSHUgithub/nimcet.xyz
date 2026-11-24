import { ClipboardList } from 'lucide-react'
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
        <Container className="pt-4 sm:pt-6">
          <section aria-labelledby="home-tests-title" className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-black p-3 text-white sm:gap-4 sm:px-5">
            <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 sm:inline-flex" aria-hidden="true">
              <ClipboardList size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="home-tests-title" className="text-sm font-semibold">NIMCET Practice Tests</h2>
              <p className="mt-0.5 text-xs leading-snug text-neutral-300 sm:text-sm">NIMCET is all about timed mock tests pratice.</p>
            </div>
            <Button as={Link} to="/tests" size="sm" variant="inverse" className="min-h-11 shrink-0">Practice Tests</Button>
          </section>
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
