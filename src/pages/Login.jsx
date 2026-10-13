import { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LoginForm from '../components/auth/LoginForm'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'
import SignInBenefits from '../components/auth/SignInBenefits'

export default function Login() {
  const [toast, setToast] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const handleLogin = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    setIsLoading(false)
    setToast('Authentication backend not connected yet.')
  }

  const handleSocial = async (provider) => {
  if (provider === 'google') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })

    if (error) {
      console.error('Google login error:', error)
      setToast('Unable to continue with Google.')
    }

    return
  }

  if (provider === 'github') {
    setToast('GitHub login will be available soon.')
  }
}

  return (
    <div className="auth-page">
      <Navbar />
      <main className="auth-page__main">
        <div className="container">
          <div className="auth-card">
            <LoginForm
              onSubmit={handleLogin}
              onSocialClick={handleSocial}
              isLoading={isLoading}
            />
            <div className="auth-card__divider" aria-hidden="true" />
            <SignInBenefits/>
          </div>
        </div>
      </main>
      <Footer />
      <Toast message={toast} onDismiss={() => setToast('')} />
    </div>
  )
}
