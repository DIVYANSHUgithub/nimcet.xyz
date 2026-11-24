import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { pageTitle } from '../lib/navigation'
import PageLoading from './PageLoading'

export function RequireSession({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoading message="Checking your sign-in…" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  return children
}

export function SignedOutOnly({ children, authPending = false }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoading message="Checking your sign-in…" />
  // An auth form that just created a session still owns its return navigation.
  if (user && !authPending) return <Navigate to="/" replace />
  return children
}

export function RouteAccessibility() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = `${pageTitle(pathname)} — NIMCET.XYZ`
    let focused = null
    function focusContent() {
      const main = document.querySelector('main')
      if (!main || main === focused) return
      main.id = 'main-content'
      main.tabIndex = -1
      main.focus({ preventScroll: true })
      focused = main
    }
    focusContent()
    window.scrollTo({ top: 0, behavior: 'instant' })
    const observer = new MutationObserver(focusContent)
    observer.observe(document.getElementById('root'), { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [pathname])
  return <a className="skip-link" href="#main-content">Skip to main content</a>
}
