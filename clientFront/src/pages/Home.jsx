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
import { legalDetails } from '../lib/legal'

const siteSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'NIMCET.XYZ',
  url: `${legalDetails.origin}/`,
})

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
        <Container>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg bg-[radial-gradient(ellipse_at_28%_25%,rgb(125_211_252_/_0.4),transparent_65%),radial-gradient(ellipse_at_72%_70%,rgb(196_181_253_/_0.45),transparent_65%)] px-3 py-1 dark:bg-[radial-gradient(ellipse_at_28%_25%,rgb(14_116_144_/_0.35),transparent_65%),radial-gradient(ellipse_at_72%_70%,rgb(109_40_217_/_0.35),transparent_65%)]">
            <span className="text-sm font-semibold text-ink-heading">About the NIMCET exam</span>
            <Button as={Link} to="/about-nimcet" size="sm" variant="monochrome" aria-label="Click here to learn about the NIMCET exam">
              Click here
            </Button>
          </div>
        </Container>
        <Hero topics={featuredTopics} searchableItems={searchableItems} />
        <Container className="grid gap-2 pt-4 sm:pt-6 md:grid-cols-2 md:gap-3">
          <TestPromoCard
            id="home-pyq-tests-title"
            title="Previous-year papers"
            description="Take past NIMCET papers as free timed tests."
            to="/pyq?view=tests"
            buttonLabel="Take a past paper"
            icon={FileText}
          />
          <TestPromoCard
            id="home-tests-title"
            title="NIMCET mock tests"
            description="Build exam pacing with timed practice."
            to="/tests"
            buttonLabel="Browse mock tests"
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
        <section aria-labelledby="exam-resources-title" className="border-t border-line bg-surface py-8 sm:py-10">
          <Container>
            <h2 id="exam-resources-title" className="text-xl font-bold text-ink-heading">About the NIMCET exam</h2>
            <p className="mt-2 max-w-3xl text-base text-ink-muted">
              NIMCET is the NIT MCA Common Entrance Test for admission to MCA programmes at participating institutes.
              See the <Link to="/about-nimcet" className="font-semibold text-accent underline underline-offset-4">NIMCET exam guide</Link> for the syllabus, eligibility and exam pattern.
              Preparing for the next cycle? Read the <Link to="/nimcet-2027" className="font-semibold text-accent underline underline-offset-4">NIMCET 2027 preparation guide</Link> or review the <Link to="/nimcet-2026" className="font-semibold text-accent underline underline-offset-4">NIMCET 2026 exam archive</Link>.
            </p>
          </Container>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteSchema }} />
    </div>
  )
}
