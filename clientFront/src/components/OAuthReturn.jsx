import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { takeOAuthReturn } from '../lib/authReturn'

export default function OAuthReturn() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (loading || !user || location.pathname !== '/questions') return
    // Keep the existing allowlisted OAuth callback URL. The original destination
    // survives the provider's full-page redirect in this tab's session storage.
    const destination = takeOAuthReturn()
    if (destination) navigate(destination, { replace: true })
  }, [loading, user, location.pathname, navigate])
  return null
}
