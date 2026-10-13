import { ArrowRight } from 'lucide-react'
import { popularTopicsRanked } from '../../data/questionBank'

export default function PopularTopicsCard() {
  return (
    <div className="qb-panel popular-topics-card">
      <h2 className="qb-panel__title">Popular Topics</h2>
      <p className="popular-topics-card__subtitle">Most practiced topics this month</p>
      <ol className="popular-topics-card__list">
        {popularTopicsRanked.map((item, index) => (
          <li key={item.name}>
            <button type="button" className="popular-topics-card__row">
              <span className="popular-topics-card__rank">{index + 1}</span>
              <span className="popular-topics-card__name">{item.name}</span>
              <span className="popular-topics-card__count">{item.count}</span>
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="popular-topics-card__all">
        View All Topics
        <ArrowRight size={16} />
      </button>
    </div>
  )
}
