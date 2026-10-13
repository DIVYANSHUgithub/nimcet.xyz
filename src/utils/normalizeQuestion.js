function parseOptions(value) {
  if (Array.isArray(value)) return value.map((option) => String(option ?? ''))
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map((option) => String(option ?? '')) : []
    } catch {
      return []
    }
  }
  return []
}

export function validateQuestion(question = {}) {
  const issues = []
  if (!String(question.id ?? '').trim()) issues.push('missing-id')
  if (!String(question.question ?? '').trim()) issues.push('missing-question')
  const options = Array.isArray(question.options) ? question.options : []
  if (options.length < 2 || options.some((option) => !String(option ?? '').trim())) issues.push('missing-options')
  if (
    !Number.isInteger(question.correctOptionIndex) ||
    question.correctOptionIndex < 0 ||
    question.correctOptionIndex >= question.options.length
  ) {
    issues.push('invalid-correct-option')
  }
  if (!question.explanation.trim()) issues.push('missing-explanation')
  return issues
}

export function normalizeQuestion(row = {}) {
  if (row == null || typeof row !== 'object') row = {}
  const options = parseOptions(row.options)
  const correctOptionIndex = Number.isInteger(row.correct_option)
    ? row.correct_option
    : Number.NaN

  const question = {
    id: row.id == null ? '' : String(row.id),
    subject: String(row.subject ?? ''),
    section: String(row.section ?? ''),
    chapter: row.chapter == null ? null : String(row.chapter),
    topic: String(row.topic ?? ''),
    difficulty: row.difficulty == null ? null : String(row.difficulty),
    type: options.length ? 'MCQ' : 'Unspecified',
    question: String(row.question ?? ''),
    options,
    correctOptionIndex,
    correctAnswer: Number.isInteger(correctOptionIndex) ? options[correctOptionIndex] ?? '' : '',
    explanation: String(row.explanation ?? ''),
    exam: String(row.exam ?? ''),
    examYear: row.exam_year == null ? null : Number(row.exam_year),
    source: String(row.source ?? ''),
    status: String(row.status ?? ''),
    questionNumber: row.question_number == null ? null : Number(row.question_number),
    createdAt: String(row.created_at ?? ''),
  }

  question.validationIssues = validateQuestion(question)
  return question
}
