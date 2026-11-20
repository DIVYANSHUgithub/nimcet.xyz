function isImageUrl(value) {
  return typeof value === 'string' &&
    /^(https?:)?\/\//i.test(value.trim()) &&
    /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#]|$)/i.test(value.trim())
}

export function inlineImageUrl(block) {
  if (!block || !['image', 'legacy_image'].includes(block.type) || block.media_id || typeof block.url !== 'string') return ''
  const value = block.url.trim()
  if (!/^https?:\/\//i.test(value)) return ''
  try {
    const url = new URL(value)
    return url.hostname && !url.username && !url.password ? value : ''
  } catch {
    return ''
  }
}

export function normalizeOption(option) {
  if (typeof option === 'string') {
    const value = option.trim()
    // Legacy image URLs may be stored directly in options. Keep ordinary text strings
    // unchanged so existing components and records remain backward-compatible.
    return isImageUrl(value)
      ? { text: '', imageUrl: value, isImage: true }
      : option
  }

  if (option && typeof option === 'object') {
    const text = String(option.text ?? option.label ?? '')
    const imageUrl = String(option.image_url ?? option.imageUrl ?? option.url ?? '')
    return { ...(option.id ? { id: option.id } : {}), ...(option.blocks ? { blocks: option.blocks } : {}), text, imageUrl, isImage: Boolean(imageUrl) }
  }

  return String(option ?? '')
}

function hasOptionContent(option) {
  if (typeof option === 'string') return Boolean(option.trim())
  if (!option || typeof option !== 'object') return false
  return Boolean(
    (Array.isArray(option.blocks) && option.blocks.length > 0) ||
    String(option.text ?? '').trim() ||
    String(option.imageUrl ?? option.image_url ?? option.url ?? '').trim()
  )
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
  if (!String(question.question ?? '').trim() && !question.questionImageUrl && !question.statementBlocks?.length) issues.push('missing-question')
  const options = Array.isArray(question.options) ? question.options : []
  if (options.length < 2 || options.some((option) => !hasOptionContent(option))) issues.push('missing-options')
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
  const rawStatement = row.question?.blocks ?? row.question?.statement ?? row.question
  const statementBlocks = row.statement_blocks ?? (Array.isArray(rawStatement) ? rawStatement : rawStatement?.type ? [rawStatement] : [])
  const correctOptionIndex = Number.isInteger(row.correct_option)
    ? row.correct_option
    : Number.NaN

  const question = {
    id: row.id == null ? '' : String(row.id),
    revision: row.revision ?? 0,
    subject: String(row.subject ?? ''),
    section: String(row.section ?? ''),
    chapter: row.chapter == null ? null : String(row.chapter),
    topic: String(row.topic ?? ''),
    pyqTopic: String(row.pyq_topic ?? ''),
    pyqChapter: String(row.pyq_chapter ?? ''),
    pyqYears: Array.isArray(row.pyq_years) ? row.pyq_years : [],
    difficulty: row.difficulty == null ? null : String(row.difficulty),
    type: options.length ? 'MCQ' : 'Unspecified',
    question: typeof row.question === 'string' ? row.question : String(row.question?.text ?? ''),
    questionImageUrl: String(row.question_image_url ?? row.questionImageUrl ?? row.question?.image_url ?? ''),
    options,
    statementBlocks,
    optionIds: row.option_ids ?? options.map((o, i) => o?.id ?? `option-${i}`),
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
