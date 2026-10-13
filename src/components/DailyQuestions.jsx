import { useState } from 'react'
import SectionHeader from './SectionHeader'
import DailyQuestionCard from './DailyQuestionCard'
import Container from './ui/Container'
import { dailyQuestions, dailyQuestionsTopic } from '../data/questions'
import { formatDisplayDate } from '../utils/formatDate'

export default function DailyQuestions() {
  const [expandedId, setExpandedId] = useState(null)
  const verifiedQuestions = dailyQuestions.filter((question) => question.verificationStatus !== 'needs-review')

  const handleToggle = (id) => setExpandedId((previous) => previous === id ? null : id)

  return (
    <section className="bg-canvas-muted py-14 sm:py-16">
      <Container>
        <SectionHeader title="Questions of the Day" subtitle={`Today's focus: ${dailyQuestionsTopic}`} meta={formatDisplayDate()} />
        <p className="mb-6 max-w-2xl text-sm leading-6 text-ink-muted">Practice questions on {dailyQuestionsTopic} with worked explanations.</p>
        <div className="space-y-3">
          {verifiedQuestions.map((question, index) => (
            <DailyQuestionCard
              key={question.id}
              question={question}
              index={index}
              total={verifiedQuestions.length}
              isExpanded={expandedId === question.id}
              onToggle={() => handleToggle(question.id)}
            />
          ))}
        </div>
      </Container>
    </section>
  )
}
