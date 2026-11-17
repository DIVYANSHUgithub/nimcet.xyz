import { useEffect, useRef, useState } from 'react'
import { FaGoogle, FaGithub } from 'react-icons/fa'
import { getSupabaseConfigError, supabase } from '../../lib/supabase'
import { useLocation } from 'react-router-dom'
import { signInReturnPath } from '../../lib/navigation'
import { clearOAuthReturn, rememberOAuthReturn } from '../../lib/authReturn'

const providers = [
  { id: 'google', label: 'Google', Icon: FaGoogle },
  { id: 'github', label: 'GitHub', Icon: FaGithub },
]

export default function SocialLogin() {
  const location = useLocation()
  const [loadingProvider, setLoadingProvider] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const activeRequest = useRef(null)

  useEffect(() => {
    const handlePageShow = (event) => {
      if (!event.persisted) return
      // Browser Back can restore the entire page, including its pending UI state.
      activeRequest.current = null
      clearOAuthReturn()
      setLoadingProvider('')
      setErrorMessage('')
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      activeRequest.current = null
    }
  }, [])

  const handleSocialLogin = async (provider) => {
    if (activeRequest.current) return
    setErrorMessage('')
    if (!supabase) {
      setErrorMessage(getSupabaseConfigError().message)
      return
    }

    const request = Symbol(provider)
    activeRequest.current = request
    setLoadingProvider(provider)
    rememberOAuthReturn(signInReturnPath(location))
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/questions` },
      })
      if (error) throw error
    } catch (error) {
      if (activeRequest.current !== request) return
      clearOAuthReturn()
      console.error(`${provider} sign in failed:`, error)
      setErrorMessage(error?.message || `Unable to continue with ${provider}. Please try again.`)
    } finally {
      // OAuth preparation may finish without leaving this page (e.g. navigation
      // was cancelled). Never leave the buttons waiting for a redirect callback.
      if (activeRequest.current === request) {
        activeRequest.current = null
        setLoadingProvider('')
      }
    }
  }

  return (
    <div className="mt-6 border-t border-line pt-4" aria-label="Social sign in">
      <p className="mb-3 text-center text-xs leading-5 text-ink-muted">Or continue with</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {providers.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleSocialLogin(id)}
            disabled={Boolean(loadingProvider)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink-heading transition hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
          >
            {Icon && <Icon size={17} aria-hidden="true" />}
            {loadingProvider === id ? `Connecting to ${label}…` : label}
          </button>
        ))}
      </div>
      {errorMessage && <p className="mt-3 text-center text-xs leading-5 text-danger" role="alert">{errorMessage}</p>}
    </div>
  )
}
