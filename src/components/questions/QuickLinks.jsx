import { Clock, FileQuestion, Shuffle, Star, TrendingUp } from 'lucide-react'
import { quickLinks } from '../../data/questionBank'

const iconMap = {
  file: FileQuestion,
  star: Star,
  shuffle: Shuffle,
  clock: Clock,
  trending: TrendingUp,
}

export default function QuickLinks() {
  return (
    <div className="qb-panel">
      <h2 className="qb-panel__title">Quick Links</h2>
      <ul className="quick-links">
        {quickLinks.map((link) => {
          const Icon = iconMap[link.icon]
          return (
            <li key={link.id}>
              <button type="button" className="quick-links__item">
                <span className="quick-links__icon">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span>{link.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
