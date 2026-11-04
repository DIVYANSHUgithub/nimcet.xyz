export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim())
}

export function validateLogin(values = {}) {
  const errors = {}
  const email = String(values.email ?? '').trim()
  if (!email) errors.email = 'Enter your email address.'
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.'
  if (!values.password) errors.password = 'Enter your password.'
  return errors
}

export function validateSignup(values = {}) {
  const errors = {}
  if (!String(values.fullName ?? '').trim()) errors.fullName = 'Enter your full name.'
  const email = String(values.email ?? '').trim()
  if (!email) errors.email = 'Enter your email address.'
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.'
  if (!String(values.username ?? '').trim()) errors.username = 'Choose a username.'
  if (!values.password) errors.password = 'Create a password.'
  else if (String(values.password).length < 6) errors.password = 'Password must be at least 6 characters.'
  if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password.'
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.'
  return errors
}
