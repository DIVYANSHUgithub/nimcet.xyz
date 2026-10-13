import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import SectionHeader from './SectionHeader'
import { popularTopics } from '../data/topics'

export default function PopularTopics() {
  const [activeTopic, setActiveTopic] = useState(null)

  return (
    <section className="section popular-topics">
      <div className="container">
        <SectionHeader
          title="Popular Topics"
          subtitle="Explore frequently practiced topics among NIMCET aspirants."
          action={
            <a href="#topics" className="section-header__link">
              View all topics
              <ArrowRight size={16} />
            </a>
          }
        />
        <div className="popular-topics__pills">
          {popularTopics.map((topic) => (
            <button
              key={topic}
              type="button"
              className={`pill ${activeTopic === topic ? 'pill--active' : ''}`}
              onClick={() => setActiveTopic(activeTopic === topic ? null : topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
