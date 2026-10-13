import { useState } from 'react'
import SectionHeader from './SectionHeader'
import DailyQuestionCard from './DailyQuestionCard'
import { dailyQuestions, dailyQuestionsTopic } from '../data/questions'
import { formatDisplayDate } from '../utils/formatDate'

export default function DailyQuestions() {
  const [expandedId, setExpandedId] = useState(null)

  const handleToggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <section className="section daily-questions">
      <div className="container">
        <SectionHeader
          title="10 Questions of the Day"
          subtitle={`Today's focus: ${dailyQuestionsTopic}`}
          meta={formatDisplayDate()}
        />
        <p className="daily-questions__intro">
          Here are 10 carefully selected NIMCET questions on {dailyQuestionsTopic} to help
          you practice.
        </p>
        <div className="daily-questions__list">
          {dailyQuestions.map((q, i) => (
            <DailyQuestionCard
              key={q.id}
              question={q}
              index={i}
              total={dailyQuestions.length}
              isExpanded={expandedId === q.id}
              onToggle={() => handleToggle(q.id)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
