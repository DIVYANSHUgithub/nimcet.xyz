export const popularSearches = [
  'Probability',
  'Algebra',
  'DBMS',
  'Number System',
  'Logical Reasoning',
]

export const popularTopics = [
  'Algebra',
  'Number System',
  'Arithmetic',
  'Probability',
  'Permutation & Combination',
  'Coordinate Geometry',
  'Calculus',
  'Trigonometry',
  'Logical Reasoning',
  'Data Structures',
  'Operating Systems',
  'DBMS',
]

export const searchableItems = [
  ...popularSearches.map((term) => ({ type: 'topic', label: term })),
  ...popularTopics.map((term) => ({ type: 'topic', label: term })),
  { type: 'subject', label: 'Mathematics' },
  { type: 'subject', label: 'Reasoning' },
  { type: 'subject', label: 'Computer' },
  { type: 'subject', label: 'English' },
  { type: 'question', label: 'Quadratic Equations roots' },
  { type: 'question', label: 'Probability of sum 8 with two dice' },
]
