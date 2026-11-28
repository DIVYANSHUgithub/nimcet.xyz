export const searchPages = {
  '/': {
    module: 'Home',
    title: 'NIMCET Preparation, Questions & Mock Tests',
    description: 'Prepare for the NIT MCA Common Entrance Test with topic-wise NIMCET questions, worked solutions, previous-year papers and timed mock tests.',
  },
  '/about-nimcet': {
    module: 'AboutNimcet',
    title: 'NIMCET Exam Guide: Syllabus, Eligibility, Pattern & Seats',
    description: 'Explore the revised NIMCET syllabus, 2026 exam pattern, eligibility, participating colleges, official seat matrix and counselling. Check the latest 2027 status.',
    openGraphType: 'article',
  },
  '/nimcet-2027': {
    module: 'Nimcet2027',
    title: 'NIMCET 2027: Exam Updates, Syllabus & Preparation',
    description: 'Check where to find official NIMCET 2027 dates and eligibility, review the previous syllabus, and start preparing with practice questions and past papers.',
  },
  '/nimcet-2026': {
    module: 'Nimcet2026',
    title: 'NIMCET 2026: Exam Date, Pattern & Official Resources',
    description: 'Review the NIMCET 2026 exam date, eligibility, section timings, scoring, and links to the official brochure and counselling resources.',
  },
  '/questions': {
    module: 'QuestionBank',
    title: 'NIMCET Question Bank with Solutions',
    description: 'Practise NIMCET questions by subject, topic and difficulty. Check your answers and read explanations in the NIMCET question bank.',
  },
  '/pyq': {
    module: 'PYQ',
    title: 'NIMCET PYQ: Previous-Year Questions & Papers',
    description: 'Browse NIMCET PYQs by exam year, subject and topic. Try individual previous-year questions or take available past papers as free timed tests.',
  },
  '/tests': {
    module: 'TestCatalog',
    title: 'NIMCET Test Series & Timed Mock Tests',
    description: 'Browse the NIMCET test series for timed mock exams and practice sets. Save your progress and review results when they’re released.',
  },
}

export function getSearchPage(pathname) {
  return searchPages[pathname.replace(/\/+$/, '') || '/']
}
