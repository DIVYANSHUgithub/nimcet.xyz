import { highlightQuestion, dailyQuestions } from './questions'

/** Question bank entries derived from existing question data only. */
export const bankQuestions = [
  {
    id: 'highlight',
    subject: 'Mathematics',
    chapter: highlightQuestion.chapter,
    topic: highlightQuestion.topic,
    difficulty: highlightQuestion.difficulty,
    type: 'MCQ',
    question: highlightQuestion.question,
    options: highlightQuestion.options,
    answer: highlightQuestion.answer,
    explanation: highlightQuestion.explanation,
    attempts: 1200,
    year: 2025,
    createdAt: '2026-09-28',
  },
  ...dailyQuestions.map((q, index) => ({
    id: `daily-${q.id}`,
    subject: 'Mathematics',
    chapter: 'Probability',
    topic: q.topic,
    difficulty: q.difficulty,
    type: 'MCQ',
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    attempts: 950 - index * 35,
    year: index % 3 === 0 ? 2025 : 2024,
    createdAt: `2025-09-${String(27 - index).padStart(2, '0')}`,
  })),
]

export const questionBankTotals = {
  all: '2,000+',
  mathematics: '2000+',
  reasoning: '1200+',
  computer: '1000+',
  english: '800+',
}

export const popularTopicsRanked = [
  { name: 'Quadratic Equations', count: 320 },
  { name: 'Probability', count: 280 },
  { name: 'Permutation & Combination', count: 250 },
  { name: 'Number System', count: 240 },
  { name: 'Inequalities', count: 220 },
  { name: 'Functions', count: 210 },
  { name: 'Coordinate Geometry', count: 200 },
  { name: 'Algebraic Expressions', count: 180 },
  { name: 'Trigonometry', count: 170 },
  { name: 'Matrices & Determinants', count: 150 },
]

export const quickLinks = [
  { id: 'pyqs', label: 'Previous Year Questions', icon: 'file' },
  { id: 'important', label: 'Important Questions', icon: 'star' },
  { id: 'random', label: 'Random Questions', icon: 'shuffle' },
  { id: 'recent', label: 'Recently Added', icon: 'clock' },
  { id: 'attempted', label: 'Most Attempted', icon: 'trending' },
]

export const subjectTabs = [
  { id: 'all', label: 'All Questions' },
  { id: 'mathematics', label: 'Mathematics' },
  { id: 'reasoning', label: 'Reasoning' },
  { id: 'computer', label: 'Computer' },
  { id: 'english', label: 'English' },
]

export const PAGE_SIZE = 10

export function formatAttempts(count) {
  if (count >= 1000) {
    const k = count / 1000
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`
  }
  return String(count)
}

export function getUniqueValues(questions, key) {
  return [...new Set(questions.map((q) => q[key]).filter(Boolean))].sort()
}
