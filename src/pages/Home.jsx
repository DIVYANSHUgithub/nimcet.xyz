import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import SectionHeader from '../components/SectionHeader'
import SubjectCard from '../components/SubjectCard'
import PopularTopics from '../components/PopularTopics'
import DailyQuestions from '../components/DailyQuestions'
import PracticeCTA from '../components/PracticeCTA'
import Footer from '../components/Footer'
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
        <section className="py-14 sm:py-16">
          <Container>
            <SectionHeader title="Explore by Subject" subtitle="Browse published questions by subject." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
              {subjects.map((subject) => <SubjectCard key={subject.id} subject={subject} />)}
            </div>
          </Container>
        </section>
        <PopularTopics topics={featuredTopics} />
        <DailyQuestions />
        <PracticeCTA />
      </main>
      <Footer />
    </div>
  )
}
