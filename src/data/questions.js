export const dailyQuestionsTopic = 'Probability'

export const dailyQuestions = [
  {
    id: 1,
    // The displayed summation, selected answer, and probability explanation conflict.
    // Exclude until an authoritative source confirms the original question and answer.
    verificationStatus: 'needs-review',
    topic: 'Probability',
    difficulty: 'Medium',
    question:
      '(k=1∑n​(−1)k−1k)2−k=1∑n​(−1)k−1k2+2450=0',
    options: ['98', '99', '100', '101'],
    answer: 'B. 99',
    explanation:
      'Total outcomes = 36. Favourable pairs for sum 8: (2,6), (3,5), (4,4), (5,3), (6,2) — 5 outcomes. P = 5/36.',
  },
  {
    id: 2,
    topic: 'Probability',
    difficulty: 'Easy',
    question:
      'A fair coin is tossed three times. What is the probability of getting exactly two heads?',
    options: ['1/8', '3/8', '1/2', '5/8'],
    answer: 'B. 3/8',
    explanation:
      'Total outcomes = 8. Favourable: HHT, HTH, THH — 3 outcomes. P = 3/8.',
  },
  {
    id: 3,
    topic: 'Probability',
    difficulty: 'Medium',
    question:
      'A bag contains 5 red and 3 blue balls. One ball is drawn at random. What is the probability it is red?',
    options: ['3/8', '5/8', '1/2', '3/5'],
    answer: 'B. 5/8',
    explanation: 'Total balls = 8, red balls = 5. P(red) = 5/8.',
  },
  {
    id: 4,
    topic: 'Probability',
    difficulty: 'Hard',
    question:
      'Two cards are drawn from a standard deck without replacement. What is the probability both are aces?',
    options: ['1/169', '1/221', '1/1326', '1/676'],
    answer: 'B. 1/221',
    explanation:
      'P = (4/52) × (3/51) = 12/2652 = 1/221.',
  },
  {
    id: 5,
    topic: 'Probability',
    difficulty: 'Easy',
    question:
      'What is the probability of getting a prime number when a die is rolled once?',
    options: ['1/6', '1/3', '1/2', '2/3'],
    answer: 'C. 1/2',
    explanation:
      'Prime numbers on a die: 2, 3, 5 — three outcomes out of six. P = 3/6 = 1/2.',
  },
  {
    id: 6,
    topic: 'Probability',
    difficulty: 'Medium',
    question:
      'If P(A) = 0.4 and P(B) = 0.5, and A and B are independent, then P(A ∩ B) is:',
    options: ['0.9', '0.2', '0.1', '0.45'],
    answer: 'B. 0.2',
    explanation:
      'For independent events, P(A ∩ B) = P(A) × P(B) = 0.4 × 0.5 = 0.2.',
  },
  {
    id: 7,
    topic: 'Probability',
    difficulty: 'Medium',
    question:
      'A box contains 4 defective and 6 good items. Two items are drawn without replacement. What is the probability both are good?',
    options: ['1/3', '2/5', '1/2', '3/5'],
    answer: 'A. 1/3',
    explanation:
      'P = (6/10) × (5/9) = 30/90 = 1/3.',
  },
  {
    id: 8,
    topic: 'Probability',
    difficulty: 'Easy',
    question:
      'What is the probability of drawing a king from a well-shuffled deck of 52 cards?',
    options: ['1/52', '1/26', '1/13', '4/13'],
    answer: 'C. 1/13',
    explanation: 'There are 4 kings in 52 cards. P = 4/52 = 1/13.',
  },
  {
    id: 9,
    topic: 'Probability',
    difficulty: 'Hard',
    question:
      'Three students A, B, and C solve a problem independently with probabilities 1/2, 1/3, and 1/4 respectively. What is the probability that at least one solves it?',
    options: ['3/4', '5/6', '11/12', '7/8'],
    answer: 'A. 3/4',
    explanation:
      'P(none solves) = (1/2)(2/3)(3/4) = 1/4. P(at least one) = 1 − 1/4 = 3/4.',
  },
  {
    id: 10,
    topic: 'Probability',
    difficulty: 'Medium',
    question:
      'A number is chosen at random from 1 to 20. What is the probability that it is divisible by 2 or 5?',
    options: ['1/2', '3/5', '11/20', '3/4'],
    answer: 'B. 3/5',
    explanation:
      'Divisible by 2: 10 numbers. Divisible by 5: 4 numbers. Both (10, 20): 2 numbers. By inclusion-exclusion: 10 + 4 − 2 = 12. P = 12/20 = 3/5.',
  },
]
