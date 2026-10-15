import { useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import PopularSearches from './PopularSearches'
import HighlightQuestion from './HighlightQuestion'
import Container from './ui/Container'

export default function Hero({ topics = [], searchableItems = [] }) {
  const navigate = useNavigate()
  const runSearch = (value) => {
    const term = String(value ?? '').trim()
    const params = new URLSearchParams()
    if (term) params.set('search', term)
    navigate(`/questions${params.size ? `?${params.toString()}` : ''}`)
  }

  return (
    <section className="overflow-hidden bg-surface py-12 sm:py-16 lg:py-20">
      <Container className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
        <div className="min-w-0 max-w-2xl">
          <p className="text-xs font-bold tracking-[0.12em] text-accent">YOUR NIMCET PREPARATION PARTNER</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-ink-heading sm:text-5xl lg:text-[3.5rem]">
            Prepare for NIMCET.<br />One question at a time.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
            Practice topic-wise questions, understand detailed solutions, and build confidence for NIMCET.
          </p>
          <div className="mt-6 max-w-xl">
            <SearchBar onSearch={runSearch} placeholder="Search questions, topics, or subjects..." searchableItems={searchableItems} />
          </div>
          <div className="mt-5">
            {topics.length > 0 && <PopularSearches items={topics} onSelect={runSearch} />}
          </div>
        </div>

        <div className="min-w-0 lg:justify-self-end">
          <div className="mb-4">
            <p className="text-xs font-bold tracking-[0.12em] text-accent">FROM THE QUESTION BANK</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-heading">TODAY's CHALLENGE</h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">Review a published question with its answer key and explanation.</p>
          </div>
          <HighlightQuestion />
        </div>
      </Container>
    </section>
  )
}
