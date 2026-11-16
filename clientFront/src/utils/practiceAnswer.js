export function evaluatePracticeAnswer(question, selectedOptionIndex) {
  const options = Array.isArray(question?.options) ? question.options : []
  const correctOptionIndex = question?.correctOptionIndex
  if (
    !Number.isInteger(correctOptionIndex) ||
    correctOptionIndex < 0 ||
    correctOptionIndex >= options.length ||
    !Number.isInteger(selectedOptionIndex) ||
    selectedOptionIndex < 0 ||
    selectedOptionIndex >= options.length
  ) {
    return null
  }

  return {
    selectedOptionIndex,
    correctOptionIndex,
    isCorrect: selectedOptionIndex === correctOptionIndex,
  }
}
