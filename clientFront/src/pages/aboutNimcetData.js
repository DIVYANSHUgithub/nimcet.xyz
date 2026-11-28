const portal = 'https://nimcet.admissions.nic.in'

export const reviewedOn = '2026-11-28'
export const guideHeading = 'NIMCET exam guide'
export const official = {
  portal: `${portal}/`,
  brochure: `${portal}/document/information-brochure-2026/`,
  syllabus: `${portal}/document/syllabus-2026/`,
  seats: `${portal}/document/seat-matrix-nimcet-2026/`,
  schedule: `${portal}/schedule/`,
  counselling: `${portal}/document/user-guidelines-for-e-counselling/`,
  annexures: `${portal}/document/annexures/`,
  institutes: `${portal}/institutes/`,
  ranks: `${portal}/or-cr/`,
}

export const examPattern = [
  { id: 'math', subject: 'Mathematics', questions: 50, time: '70 min', correct: 12, wrong: 3, marks: 600 },
  { id: 'reasoning', subject: 'Analytical ability & logical reasoning', questions: 40, time: '30 min', correct: 6, wrong: 1.5, marks: 240 },
  { id: 'computers', subject: 'Computer awareness', questions: 20, time: '20 min together', correct: 6, wrong: 1.5, marks: 120 },
  { id: 'english', subject: 'General English', questions: 10, correct: 4, wrong: 1, marks: 40 },
]

// Topic coverage follows the revised 2026 syllabus.
export const syllabus = {
  math: [
    ['Sets and logic', 'Set operations (including symmetric difference), Cartesian products, cardinality, relations, functions and Venn diagrams. Truth tables, logical connectives, tautologies and contradictions.'],
    ['Probability and statistics', 'Probability fundamentals, dependent and independent events, Bayes’ theorem, averages, measures of centre and spread, moments and frequency distributions. Practise mean, median, mode, mean deviation, variance and standard deviation.'],
    ['Algebra', 'Basic algebra, real-coefficient quadratics and relationships between roots and coefficients, including symmetric expressions and sums of roots. Exponents, logarithms, arithmetic, geometric and harmonic progressions, and finite sums of powers of natural numbers. Matrices, determinants, simultaneous linear equations, permutations, combinations and the binomial theorem.'],
    ['Coordinate geometry', 'Cartesian coordinates, distance and section formulas, line equations and intersections, pairs of straight lines, circles, parabolas, ellipses and hyperbolas. Tangents and normals to circles and conics.'],
    ['Calculus', 'Real functions, one-sided limits and limits at infinity, continuity and the intermediate value theorem. Differentiation, tangents and normals, basic extrema, Rolle’s theorem and the mean value theorem. Integration by parts, substitution and partial fractions, plus definite integrals, area, and integration of even, odd and periodic functions.'],
    ['Trigonometry', 'Functions and identities, principal values of inverse functions, triangle properties and solutions, heights and distances, and general solutions to trigonometric equations.'],
  ],
  reasoning: [
    ['Reasoning and puzzles', 'Verbal, nonverbal, inductive and deductive reasoning. Family relationships, codes, directions, seating arrangements, puzzles, input–output problems, syllogisms, letter and number sequences, mirror images, and evaluating conclusions and arguments.'],
    ['Analysis and interpretation', 'Problem solving, critical thinking, numerical reasoning, interpreting and visualising data, and deciding whether the information supplied is sufficient.'],
  ],
  computers: [
    ['Computer fundamentals', 'Computer organisation, the CPU and its instruction structure, input and output devices, memory and backup devices.'],
    ['Data representation', 'How characters, integers and fractions are stored. Binary and hexadecimal notation, binary addition, subtraction, multiplication and division, two’s complement, floating-point representation and Boolean algebra.'],
    ['Hardware', 'Input devices such as keyboards, mice and scanners, output devices such as displays and printers, storage such as HDDs, SSDs and USB drives, plus RAM, ROM and cache.'],
    ['Software', 'Operating systems such as Windows, macOS, Linux and Android, system utilities, device drivers and basic application software.'],
    ['Internet and email', 'Web navigation and how the internet works, sending and managing email, and common online security risks and precautions.'],
  ],
  english: [
    ['Comprehension and vocabulary', 'Reading passages, understanding words in context, and interpreting phrases.'],
    ['Grammar and expression', 'Sentence patterns, sounds, word formation, technical writing, and clear, accurate and fluent English for technical education.'],
  ],
}

export const seatCategories = ['Open', 'OBC', 'SC', 'ST', 'EWS', 'Open–PwD', 'OBC–PwD', 'SC–PwD', 'ST–PwD', 'EWS–PwD']

// Values follow the official PDF, including its published category totals.
// Columns are in seatCategories order. A single fee means the same amount in each semester.
export const seatPrograms = [
  ['NIT Agartala', [24, 16, 6, 5, 6, 0, 0, 3, 0, 0], [56825, 39425, 40625, 39425, 42625, 43925]],
  ['MNNIT Allahabad', [45, 29, 16, 8, 11, 2, 2, 1, 1, 1], 35000, 'Prayagraj Motilal Nehru'],
  ['MANIT Bhopal', [44, 30, 16, 8, 11, 2, 1, 1, 1, 1], 35000, 'NIT Bhopal Maulana Azad'],
  ['NIT Delhi', [3, 3, 1, 1, 1, 1, 0, 0, 0, 0], 35000],
  ['NIT Delhi (Self-financing)', [6, 3, 3, 1, 1, 0, 1, 0, 0, 0], 100000],
  ['NIT Jamshedpur', [45, 30, 16, 8, 10, 2, 1, 1, 1, 1], 35000],
  ['NIT Kurukshetra', [25, 16, 9, 5, 6, 1, 1, 1, 0, 0], 35000],
  ['NIT Kurukshetra (Self-financing)', [17, 11, 6, 2, 4, 0, 0, 0, 1, 1], 100000],
  ['NIT Raipur', [43, 27, 15, 8, 11, 2, 1, 1, 1, 1], 35000],
  ['NIT Meghalaya', [8, 5, 3, 1, 2, 0, 0, 0, 1, 0], 35000],
  ['NIT Tiruchirappalli', [45, 29, 16, 9, 10, 2, 2, 1, 0, 1], 35000, 'NIT Trichy Tiruchi'],
  ['NIT Warangal', [22, 15, 9, 3, 6, 1, 1, 0, 1, 0], 35000],
  ['NIT Patna (Data Sciences & Informatics)', [15, 10, 6, 3, 4, 1, 1, 0, 0, 0], 50000],
  ['NIT Patna (Data Sciences & Informatics, Self-financing)', [15, 10, 6, 3, 4, 1, 1, 0, 0, 0], 125000],
  ['NIT Patna (AI & IoT)', [15, 10, 5, 3, 4, 1, 1, 1, 0, 0], 50000],
  ['NIT Patna (AI & IoT, Self-financing)', [15, 10, 6, 3, 4, 1, 1, 0, 0, 0], 125000],
  ['IIIT Bhopal', [34, 23, 13, 7, 9, 2, 1, 1, 0, 0], 121275],
  ['IIIT Vadodara (Gandhinagar campus)', [46, 31, 17, 9, 11, 2, 1, 1, 1, 1], 125000],
  ['IIIT Vadodara (International Campus, Diu)', [34, 23, 13, 7, 9, 2, 1, 1, 0, 0], 125000],
]

export const publishedSeatTotals = [501, 331, 182, 93, 125, 23, 17, 13, 9, 6]
export const testCentres = [
  'Agartala', 'Ahmedabad', 'Ambala', 'Bhilai', 'Bhopal', 'Bhubaneswar', 'Chennai', 'Cuttack',
  'Dhenkanal', 'Guwahati', 'Haldwani', 'Hyderabad', 'Indore', 'Jaipur', 'Jamshedpur', 'Kanpur',
  'Kolkata', 'Kozhikode', 'Lucknow', 'Mangaluru', 'Mohali', 'Muzaffarpur', 'New Delhi',
  'Paschim Medinipur', 'Patna', 'Phagwara', 'Prayagraj (Allahabad)', 'Pune', 'Purba Medinipur',
  'Purnia', 'Raipur', 'Ranchi', 'Roorkee', 'Rourkela', 'Shillong', 'Silchar', 'Srinagar',
  'Surat', 'Tiruchirappalli', 'Varanasi', 'Vijayawada', 'Warangal',
]
