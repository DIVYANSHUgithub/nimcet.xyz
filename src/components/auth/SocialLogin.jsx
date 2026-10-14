import { useState } from 'react'
import { FaGoogle, FaGithub } from 'react-icons/fa'
import { getSupabaseConfigError, supabase } from '../../lib/supabase'

const providers = [
  { id: 'google', label: 'Google', Icon: FaGoogle },
  { id: 'github', label: 'GitHub', Icon: FaGithub },
]

export default function SocialLogin() {
  const [loadingProvider, setLoadingProvider] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSocialLogin = async (provider) => {
    if (loadingProvider) return
    setErrorMessage('')
    if (!supabase) {
      setErrorMessage(getSupabaseConfigError().message)
      return
    }

    setLoadingProvider(provider)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/questions` },
      })
      if (error) throw error
    } catch (error) {
      console.error(`${provider} sign in failed:`, error)
      setErrorMessage(error?.message || `Unable to continue with ${provider}. Please try again.`)
      setLoadingProvider('')
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
