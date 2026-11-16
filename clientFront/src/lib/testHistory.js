export function attemptElapsedSeconds(attempt) {
  if (!attempt.submitted_at) return null
  const start = Date.parse(attempt.started_at)
  const submitted = Date.parse(attempt.submitted_at)
  const deadline = attempt.deadline_at ? Date.parse(attempt.deadline_at) : submitted
  if (![start, submitted, deadline].every(Number.isFinite)) return null
  return Math.max(0, Math.floor((Math.min(submitted, deadline) - start) / 1000))
}
