import { BookOpen, Brain, Calculator, ChevronRight, Monitor } from 'lucide-react'
import { subjects } from '../../data/subjects'

const iconMap = {
  calculator: Calculator,
  brain: Brain,
  monitor: Monitor,
  'book-open': BookOpen,
}

export default function SubjectList({ selectedId, onSelect }) {
  return (
    <div className="qb-panel">
      <h2 className="qb-panel__title">Subjects</h2>
      <ul className="subject-list">
        {subjects.map((subject) => {
          const Icon = iconMap[subject.icon] || BookOpen
          const isActive = selectedId === subject.id
          return (
            <li key={subject.id}>
              <button
                type="button"
                className={`subject-list__item ${isActive ? 'subject-list__item--active' : ''}`}
                onClick={() => onSelect?.(subject.id)}
              >
                <span className="subject-list__icon">
                  <Icon size={18} strokeWidth={1.5} />
                </span>
                <span className="subject-list__content">
                  <span className="subject-list__name">{subject.name}</span>
                  <span className="subject-list__meta">
                    {subject.chapters} Chapters | {subject.questions} Questions
                  </span>
                </span>
                <ChevronRight size={16} className="subject-list__arrow" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
