import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SignupForm from '../components/auth/SignupForm'
import SignupBenefits from '../components/auth/SignupBenefits'
import { getSupabaseConfigError, supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()

  const handleSignup = async ({ fullName, email, username, password }) => {
    if (!supabase) return { error: getSupabaseConfigError().message }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, username },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) return { error: error.message || 'Unable to create your account.' }
    if (data.session) {
      navigate('/questions')
      return { message: 'Account created. You are signed in.' }
    }
    return { message: 'Account created. Check your email to confirm the address before signing in.' }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex flex-1 items-center py-8 md:py-12">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-xl border border-line bg-surface shadow-sm px-0 sm:mx-5 sm:grid-cols-[1.1fr_0.9fr]">
          <SignupForm onSubmit={handleSignup} />
          <SignupBenefits />
        </div>
      </main>
      <Footer />
    </div>
  )
}
