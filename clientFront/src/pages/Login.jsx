import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LoginForm from '../components/auth/LoginForm'
import Toast from '../components/Toast'
import SignInBenefits from '../components/auth/SignInBenefits'
import { getSupabaseConfigError, supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import { isValidEmail } from '../utils/validateAuth'

export default function Login() {
  const [toast, setToast] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleLogin = async ({ email, password }) => {
    if (!supabase) {
      setToast(getSupabaseConfigError().message)
      return
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/questions')
    } catch (error) {
      console.error('Login failed:', error)
      setToast(error.message || 'Unable to sign in. Check your email and password.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (email) => {
    if (!isValidEmail(email)) {
      setToast('Enter a valid email address first, then select Forgot password.')
      return
    }
    if (!supabase) {
      setToast(getSupabaseConfigError().message)
      return
    }
    setIsRecoveryLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setToast(error.message || 'Unable to send a password reset email.')
      else setToast('If an account exists for that email, a password reset link has been sent.')
    } catch (error) {
      setToast(error.message || 'Unable to send a password reset email.')
    } finally {
      setIsRecoveryLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex flex-1 items-center py-10 md:py-14">
        <div className="mx-auto w-full max-w-content px-5 md:px-8">
          {user ? <p className="mx-auto mb-4 max-w-4xl text-sm text-ink-muted" role="status">You are already signed in.</p> : null}
          <div className="mx-auto grid max-w-5xl grid-cols-1 overflow-hidden rounded-xl border border-line bg-surface shadow-sm lg:grid-cols-[1fr_1px_1fr]">
            <LoginForm onSubmit={handleLogin} onForgotPassword={handleForgotPassword} isLoading={isLoading} isRecoveryLoading={isRecoveryLoading} />
            <div className="hidden bg-line lg:block" aria-hidden="true" />
            <SignInBenefits />
          </div>
        </div>
      </main>
      <Footer />
      <Toast message={toast} onDismiss={() => setToast('')} />
    </div>
  )
}
