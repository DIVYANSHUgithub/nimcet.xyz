import test from 'node:test'
import assert from 'node:assert/strict'
import { filterReviewQuestions, reviewOutcome } from '../clientFront/src/lib/resultReview.js'

test('review filters keep unanswered questions distinct from wrong answers', () => {
  const questions = [
    { selected_option_id: 'option-1', is_correct: true },
    { selected_option_id: 'option-0', is_correct: false },
    { selected_option_id: null, is_correct: false },
  ]
  assert.equal(reviewOutcome(questions[2]), 'unanswered')
  assert.deepEqual(filterReviewQuestions(questions, 'correct'), [questions[0]])
  assert.deepEqual(filterReviewQuestions(questions, 'incorrect'), [questions[1]])
  assert.deepEqual(filterReviewQuestions(questions, 'unanswered'), [questions[2]])
  assert.deepEqual(filterReviewQuestions(questions), questions)
})

test('review filters preserve the attempt snapshot order', () => {
  const questions = [3, 1, 2].map(display_order => ({ display_order, selected_option_id: 'option-1', is_correct: true }))
  assert.deepEqual(filterReviewQuestions(questions, 'correct').map(q => q.display_order), [3, 1, 2])
})
