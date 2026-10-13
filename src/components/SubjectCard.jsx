import { BookOpen, Brain, Calculator, ChevronRight, Monitor } from 'lucide-react'

const iconMap = {
  calculator: Calculator,
  brain: Brain,
  monitor: Monitor,
  'book-open': BookOpen,
}

export default function SubjectCard({ subject, onClick }) {
  const Icon = iconMap[subject.icon] || BookOpen

  return (
    <button type="button" className="subject-card" onClick={() => onClick?.(subject)}>
      <div className="subject-card__icon">
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <div className="subject-card__content">
        <h3 className="subject-card__name">{subject.name}</h3>
        <p className="subject-card__meta">
          {subject.chapters} Chapters | {subject.questions} Questions
        </p>
      </div>
      <ChevronRight size={18} className="subject-card__arrow" />
    </button>
  )
}
