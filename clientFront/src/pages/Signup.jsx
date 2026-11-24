import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { signInReturnPath } from '../lib/navigation'
import { clearOAuthReturn } from '../lib/authReturn'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { SignedOutOnly } from '../components/RouteAccess'
import SignupForm from '../components/auth/SignupForm'
import SignupBenefits from '../components/auth/SignupBenefits'
import { getSupabaseConfigError, supabase } from '../lib/supabase'

export default function Signup() {
  const [isSigningUp, setIsSigningUp] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignup = async ({ fullName, email, username, password }) => {
    if (!supabase) return { error: getSupabaseConfigError().message }
    clearOAuthReturn()
    const metadata = { full_name: fullName }
    if (username) metadata.username = username
    setIsSigningUp(true)
    let signedIn = false
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) return { error: error.message || 'Unable to create your account.' }
      if (data.session) {
        signedIn = true
        navigate(signInReturnPath(location), { replace: true })
        return { message: 'Account created. You are signed in.' }
      }
      return { message: 'Account created. Check your email to confirm the address before signing in.' }
    } finally {
      if (!signedIn) setIsSigningUp(false)
    }
  }

  return (
    <SignedOutOnly authPending={isSigningUp}>
      <div className="flex min-h-svh flex-col">
        <Navbar />
        <main className="flex flex-1 items-center px-4 py-6 sm:px-6 lg:py-10">
          <div className="mx-auto grid w-full max-w-xl grid-cols-1 overflow-hidden rounded-xl border border-line bg-surface shadow-sm lg:max-w-5xl lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <SignupForm onSubmit={handleSignup} />
            <SignupBenefits />
          </div>
        </main>
        <Footer />
      </div>
    </SignedOutOnly>
  )
}
