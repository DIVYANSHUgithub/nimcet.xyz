import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { normalizeQuestion, validateQuestion } from '../src/utils/normalizeQuestion.js'
import { buildPageNumbers } from '../src/utils/filterQuestions.js'
import { parseMathParts } from '../src/utils/parseMathParts.js'
import { dailyQuestions } from '../src/data/questions.js'
import { validateLogin, validateSignup } from '../src/utils/validateAuth.js'

test('normalizes a published database row and uses its zero-based correct option', () => {
  const question = normalizeQuestion({
    id: 42,
    exam: 'NIMCET',
    exam_year: 2026,
    subject: 'Mathematics',
    topic: 'Algebra',
    question: 'Solve for x.',
    options: ['x=1', 'x=2', 'x=3', 'x=4'],
    correct_option: 2,
    explanation: 'Solve the equation.',
    status: 'published',
  })
  assert.equal(question.id, '42')
  assert.equal(question.correctOptionIndex, 2)
  assert.equal(question.correctAnswer, 'x=3')
  assert.equal(question.chapter, null)
  assert.equal(question.difficulty, null)
  assert.equal(question.examYear, 2026)
  assert.deepEqual(question.validationIssues, [])
})

test('parses JSON options and reports missing or invalid required content', () => {
  const question = normalizeQuestion({ id: 'db-7', question: 'Select one', options: '["A", "B"]', correct_option: 2 })
  assert.deepEqual(question.options, ['A', 'B'])
  assert.ok(question.validationIssues.includes('invalid-correct-option'))
  assert.ok(question.validationIssues.includes('missing-explanation'))
  assert.ok(validateQuestion(question).includes('missing-explanation'))
})

test('parses inline and display math with dollar and bracket delimiters', () => {
  assert.deepEqual(parseMathParts('Area $x^2$ then \\(\\frac{1}{2}\\) and $$\\sum_{i=1}^n i$$ and \\[\\sqrt{4}\\]'), [
    { type: 'text', value: 'Area ' },
    { type: 'inline', value: 'x^2', source: '$x^2$' },
    { type: 'text', value: ' then ' },
    { type: 'inline', value: '\\frac{1}{2}', source: '\\(\\frac{1}{2}\\)' },
    { type: 'text', value: ' and ' },
    { type: 'display', value: '\\sum_{i=1}^n i', source: '$$\\sum_{i=1}^n i$$' },
    { type: 'text', value: ' and ' },
    { type: 'display', value: '\\sqrt{4}', source: '\\[\\sqrt{4}\\]' },
  ])
})

test('leaves malformed delimiters as text and renders supported math through KaTeX', () => {
  assert.deepEqual(parseMathParts('unfinished $x^2'), [{ type: 'text', value: 'unfinished $x^2' }])
  assert.match(katex.renderToString('\\frac{1}{2}', { throwOnError: true }), /katex/)
  assert.match(katex.renderToString('\\sum_{i=1}^{n} i', { displayMode: true, throwOnError: true }), /katex-display/)
})

test('keeps pagination within valid boundaries', () => {
  assert.deepEqual(buildPageNumbers(1, 3), [1, 2, 3])
  assert.deepEqual(buildPageNumbers(99, 8), [1, '…', 7, 8])
  assert.deepEqual(buildPageNumbers(0, 8), [1, 2, '…', 8])
  assert.deepEqual(buildPageNumbers(4, 0), [1])
})

test('marks the conflicting daily question for review and checks displayed answers on the others', () => {
  const unresolved = dailyQuestions.find((question) => question.id === 1)
  assert.equal(unresolved.verificationStatus, 'needs-review')
  for (const question of dailyQuestions.filter((item) => item.verificationStatus !== 'needs-review')) {
    const match = question.answer.match(/^([A-D])\.\s*(.*)$/)
    assert.ok(match, `Question ${question.id} should use a lettered answer`)
    const option = question.options[match[1].charCodeAt(0) - 65]
    assert.equal(option, match[2], `Question ${question.id} answer must match its option`)
  }
})

test('validates login and signup inputs before calling Supabase', () => {
  assert.deepEqual(validateLogin({ email: 'bad-address', password: '' }), {
    email: 'Enter a valid email address.',
    password: 'Enter your password.',
  })
  assert.deepEqual(validateLogin({ email: 'learner@example.com', password: 'secret1' }), {})
  const signupErrors = validateSignup({
    fullName: 'Learner',
    email: 'learner@example.com',
    username: 'learner1',
    password: 'short',
    confirmPassword: 'different',
  })
  assert.equal(signupErrors.password, 'Password must be at least 6 characters.')
  assert.equal(signupErrors.confirmPassword, 'Passwords do not match.')
})
