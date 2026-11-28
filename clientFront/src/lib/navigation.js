import { aboutPage } from './about.js'
import { getSearchPage } from './searchPages.js'

export function pageDocumentTitle(pathname) {
  return `${getSearchPage(pathname)?.title ?? pageTitle(pathname)} — NIMCET.XYZ`
}

export function safeReturnPath(value, fallback = '/questions') {
  if (typeof value !== 'string' || value.includes('\\') || [...value].some(character => character.charCodeAt(0) <= 32)) return fallback
  return /^\/(?:about(?:-nimcet)?\/?|nimcet-202[67]\/?|questions(?:\/[^?#]*)?|tests|student-pass|profile\/?|results|pyq|privacy-policy|terms|contact|attempts\/[a-zA-Z0-9-]+(?:\/result)?)?(?:[?#].*)?$/.test(value) ? value : fallback
}

export function signInReturnPath(location) {
  const explicit = ['/login', '/signup'].includes(location?.pathname)
    ? location?.state?.from ?? new URLSearchParams(location?.search).get('next') : null
  return safeReturnPath(explicit ?? `${location?.pathname || '/'}${location?.search || ''}${location?.hash || ''}`, '/')
}

export function authLinkTo(pathname, location) {
  return { pathname, search: `?next=${encodeURIComponent(signInReturnPath(location))}` }
}

export function pageTitle(pathname) {
  if (pathname.replace(/\/$/, '') === aboutPage.to) return aboutPage.title
  if (pathname.replace(/\/$/, '') === '/about-nimcet') return 'About the NIMCET exam'
  const legalTitle = { '/privacy-policy': 'Privacy Policy', '/terms': 'Terms of Service', '/contact': 'Contact Us' }[pathname.replace(/\/$/, '')]
  if (legalTitle) return legalTitle
  if (pathname === '/profile' || pathname === '/profile/') return 'My profile'
  if (/^\/attempts\/[^/]+\/result$/.test(pathname)) return 'Attempt result'
  if (pathname.startsWith('/attempts/')) return 'Test attempt'
  if (pathname.startsWith('/questions/')) return 'Practice question'
  return ({ '/': 'Prepare for NIMCET', '/questions': 'Question bank', '/tests': 'Tests', '/student-pass': 'Student Pass', '/results': 'My results', '/pyq': 'Previous-year questions', '/login': 'Sign in', '/signup': 'Create account', '/reset-password': 'Reset password' })[pathname] ?? 'Page not found'
}

export function isNavActive(pathname, target) {
  if (target === '/results') return pathname === '/results' || /^\/attempts\/[^/]+\/result$/.test(pathname)
  if (target === '/tests') return pathname === '/tests' || (pathname.startsWith('/attempts/') && !pathname.endsWith('/result'))
  return pathname === target || pathname.startsWith(`${target}/`)
}
