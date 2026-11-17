import { safeReturnPath } from './navigation.js'

const KEY = 'nimcet.oauth.return'
const MAX_AGE = 30 * 60 * 1000

export function rememberOAuthReturn(path) {
  try { window.sessionStorage.setItem(KEY, JSON.stringify({ path: safeReturnPath(path, '/'), at: Date.now() })) }
  catch { /* Sign-in can still work when browser storage is unavailable. */ }
}

export function clearOAuthReturn() {
  try { window.sessionStorage.removeItem(KEY) } catch { /* Storage is optional. */ }
}

export function takeOAuthReturn() {
  try {
    const stored = window.sessionStorage.getItem(KEY)
    window.sessionStorage.removeItem(KEY)
    if (!stored) return null
    const { path, at } = JSON.parse(stored)
    if (typeof at !== 'number' || Date.now() - at < 0 || Date.now() - at > MAX_AGE) return null
    return safeReturnPath(path, '/')
  } catch { return null }
}
