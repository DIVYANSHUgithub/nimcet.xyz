function isImageUrl(value) {
  return typeof value === 'string' && /^(https?:)?\/\//i.test(value.trim()) &&
    /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#]|$)/i.test(value.trim())
}

function normalizeOption(option) {
  if (typeof option === 'string') {
    const value = option.trim()
    // Backward compatibility: a legacy URL saved as an option is an image, not option text.
    return isImageUrl(value)
      ? { text: '', imageUrl: value, isImage: true }
      : { text: option, imageUrl: '', isImage: false }
  }
  if (option && typeof option === 'object') {
    const text = String(option.text ?? option.label ?? '')
    const imageUrl = String(option.image_url ?? option.imageUrl ?? option.url ?? '')
    return { text, imageUrl, isImage: Boolean(imageUrl) }
  }
  return { text: String(option ?? ''), imageUrl: '', isImage: false }
}

function parseOptions(value) {
  let parsed = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return []
    }
  }
  return Array.isArray(parsed) ? parsed.map(normalizeOption) : []
}

export function validateQuestion(question = {}) {
  const issues = []
  if (!String(question.id ?? '').trim()) issues.push('missing-id')
  if (!String(question.question ?? '').trim() && !question.questionImageUrl) issues.push('missing-question')
  const options = Array.isArray(question.options) ? question.options : []
  if (options.length < 2 || options.some((option) => !option.text.trim() && !option.imageUrl)) issues.push('missing-options')
  if (
    !Number.isInteger(question.correctOptionIndex) ||
    question.correctOptionIndex < 0 ||
    question.correctOptionIndex >= options.length
  ) {
    issues.push('invalid-correct-option')
  }
  if (!String(question.explanation ?? '').trim()) issues.push('missing-explanation')
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
    questionImageUrl: String(row.question_image_url ?? row.questionImageUrl ?? ''),
    options,
    correctOptionIndex,
    correctAnswer: Number.isInteger(correctOptionIndex) ? options[correctOptionIndex] ?? { text: '', imageUrl: '', isImage: false } : { text: '', imageUrl: '', isImage: false },
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
