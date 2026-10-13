import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import SectionHeader from './SectionHeader'
import Container from './ui/Container'
import { featuredQuestionTopics } from '../data/topics'

export default function PopularTopics() {
  const navigate = useNavigate()
  const selectTopic = (topic) => navigate(`/questions?topic=${encodeURIComponent(topic)}`)

  return (
    <section className="py-14" aria-label="Browse question topics">
      <Container>
        <SectionHeader
          title="Browse Topics"
          subtitle="Explore topics present in the published question set."
          action={<Link to="/questions" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-ink-heading hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">View question bank <ArrowRight size={16} aria-hidden="true" /></Link>}
        />
        <div className="flex flex-wrap gap-2">
          {featuredQuestionTopics.map((topic) => (
            <button key={topic} type="button" className="inline-flex min-h-10 items-center rounded-full border border-line bg-canvas-subtle px-3.5 text-[0.8125rem] font-medium text-ink transition-colors hover:border-line-strong hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => selectTopic(topic)}>
              {topic}
            </button>
          ))}
        </div>
      </Container>
    </section>
  )
}
