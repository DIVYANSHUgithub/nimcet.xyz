import QuestionCard from './QuestionCard'

export default function QuestionList({ questions, pageStartIndex, onBookmark }) {
  if (questions.length === 0) {
    return <div className="rounded-lg border border-line bg-surface p-6 text-center text-sm text-ink-muted">No questions match your filters. Try adjusting search or filters.</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {questions.map((question, index) => <QuestionCard key={question.id} question={question} index={pageStartIndex + index} onBookmark={onBookmark} />)}
    </div>
  )
}
