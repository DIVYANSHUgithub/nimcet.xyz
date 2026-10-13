import QuestionCard from './QuestionCard'

export default function QuestionList({ questions, pageStartIndex, onBookmark }) {
  if (questions.length === 0) {
    return (
      <div className="qb-empty">
        <p>No questions match your filters. Try adjusting search or filters.</p>
      </div>
    )
  }

  return (
    <div className="qb-question-list">
      {questions.map((question, i) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={pageStartIndex + i}
          onBookmark={onBookmark}
        />
      ))}
    </div>
  )
}
