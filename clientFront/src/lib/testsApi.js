import { backendRequest } from './backendApi'

export async function listTests({ page = 1, pageSize = 12, signal } = {}) {
  return backendRequest('tests', { params: { page, page_size: pageSize }, signal })
}

export function startTest(testId, options = {}) {
  return backendRequest(`tests/${encodeURIComponent(testId)}/attempts`, {
    method: 'POST',
    ...options,
  })
}

export function getAttempt(attemptId, options = {}) {
  return backendRequest(`attempts/${encodeURIComponent(attemptId)}`, options)
}

export function saveAnswer(attemptId, questionId, payload, options = {}) {
  return backendRequest(
    `attempts/${encodeURIComponent(attemptId)}/answers/${encodeURIComponent(questionId)}`,
    { method: 'PUT', body: payload, ...options },
  )
}

export function saveNavigation(attemptId, payload, options = {}) {
  return backendRequest(`attempts/${encodeURIComponent(attemptId)}/navigation`, {
    method: 'PUT',
    body: payload,
    ...options,
  })
}

export function submitAttempt(attemptId, options = {}) {
  return backendRequest(`attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: 'POST',
    body: { reason: 'student_submitted' },
    ...options,
  })
}

export function getAttemptResult(attemptId, options = {}) {
  return backendRequest(`attempts/${encodeURIComponent(attemptId)}/result`, options)
}

export function getAttemptReview(attemptId, options = {}) {
  return backendRequest(`attempts/${encodeURIComponent(attemptId)}/review`, options)
}

export function getMyAttempts({ page = 1, pageSize = 20, signal } = {}) {
  return backendRequest('students/me/attempts', { params: { page, page_size: pageSize }, signal })
}

export function getMyTestDashboard(options = {}) {
  return backendRequest('students/me/dashboard', options)
}
