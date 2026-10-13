
import { useState } from 'react'
import SearchBar from './SearchBar'
import PopularSearches from './PopularSearches'
import { popularSearches } from '../data/topics'
import HighlightQuestion from './HighlightQuestion'

export default function Hero() {
  const [activeSearch, setActiveSearch] = useState('')

  return (
    <section className="hero-section">
      <div className="container hero-section__inner">
        <div className="hero-section__content">
          <span className="hero-section__eyebrow">
            YOUR NIMCET PREPARATION PARTNER
          </span>

          <h1 className="hero-section__title">
            Prepare for NIMCET.
            <br />
            One question at a time.
          </h1>

          <p className="hero-section__subtitle">
            Practice topic-wise questions, understand detailed
            solutions, and build the confidence to crack NIMCET.
          </p>

          <div className="hero-section__search">
            <SearchBar
              onSearch={(q) => setActiveSearch(q)}
              placeholder="Search questions, topics, or subjects..."
            />
          </div>

          <div className="hero-section__popular">
            <PopularSearches
              items={popularSearches}
              activeItem={activeSearch}
              onSelect={setActiveSearch}
            />
          </div>
        </div>

        <div className="hero-section__challenge">
          <div className="hero-section__challenge-heading">
            <span className="hero-section__challenge-label">
              DAILY PRACTICE
            </span>

            <h2>Today's Challenge</h2>

            <p>
              A handpicked question to get your practice started.
            </p>
          </div>

          <HighlightQuestion />
        </div>
      </div>
    </section>
  )
}
