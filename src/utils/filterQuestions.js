import { PAGE_SIZE } from '../data/questionBank'

export function filterAndSortQuestions(questions, filters) {
  const {
    search,
    subjectTab,
    chapter,
    topic,
    difficulty,
    questionType,
    year,
    sort,
  } = filters

  let result = [...questions]

  if (subjectTab && subjectTab !== 'all') {
    const subjectName = subjectTab.charAt(0).toUpperCase() + subjectTab.slice(1)
    const map = {
      mathematics: 'Mathematics',
      reasoning: 'Reasoning',
      computer: 'Computer',
      english: 'English',
    }
    result = result.filter((q) => q.subject === map[subjectTab] || subjectName === q.subject)
  }

  if (chapter) {
    result = result.filter((q) => q.chapter === chapter)
  }
  if (topic) {
    result = result.filter((q) => q.topic === topic)
  }
  if (difficulty) {
    result = result.filter((q) => q.difficulty === difficulty)
  }
  if (questionType) {
    result = result.filter((q) => q.type === questionType)
  }
  if (year) {
    result = result.filter((q) => String(q.year) === String(year))
  }

  const query = search.trim().toLowerCase()
  if (query) {
    result = result.filter(
      (q) =>
        q.question.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query) ||
        q.chapter.toLowerCase().includes(query) ||
        q.subject.toLowerCase().includes(query)
    )
  }

  if (sort === 'newest') {
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } else if (sort === 'attempts') {
    result.sort((a, b) => b.attempts - a.attempts)
  }

  return result
}

export function paginateQuestions(questions, page) {
  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  return {
    page: safePage,
    totalPages,
    items: questions.slice(start, start + PAGE_SIZE),
    start: questions.length ? start + 1 : 0,
    end: Math.min(start + PAGE_SIZE, questions.length),
    total: questions.length,
  }
}

export function buildPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = [1]
  if (current > 3) pages.push('…')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i += 1) {
    if (!pages.includes(i)) pages.push(i)
  }
  if (current < total - 2) pages.push('…')
  if (!pages.includes(total)) pages.push(total)
  return pages
}
