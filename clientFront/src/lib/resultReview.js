export function reviewOutcome(question) {
  if (question.selected_option_id == null) return 'unanswered'
  return question.is_correct ? 'correct' : 'incorrect'
}

export function filterReviewQuestions(questions, filter = 'all') {
  return filter === 'all' ? questions : questions.filter(question => reviewOutcome(question) === filter)
}
