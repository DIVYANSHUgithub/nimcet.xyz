import { Link } from 'react-router-dom'
import { BarChart3, Bookmark, ClipboardCheck, Target } from 'lucide-react'

const benefits = [
  { icon: ClipboardCheck, text: 'Attempt questions' },
  { icon: Bookmark, text: 'Save important questions' },
  { icon: Target, text: 'Track your accuracy' },
  { icon: BarChart3, text: 'Get topic-wise analytics' },
]

export default function PracticeCard() {
  return (
    <div className="qb-panel practice-card">
      <h2 className="qb-panel__title">Your Practice</h2>
      <p className="practice-card__subtitle">Login to track your progress</p>
      <ul className="practice-card__list">
        {benefits.map(({ icon: Icon, text }) => (
          <li key={text} className="practice-card__item">
            <span className="practice-card__icon">
              <Icon size={15} strokeWidth={1.75} />
            </span>
            {text}
          </li>
        ))}
      </ul>
      <Link to="/login" className="btn btn--primary btn--full practice-card__cta">
        Login to Practice
      </Link>
    </div>
  )
}
