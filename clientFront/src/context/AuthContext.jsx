import { useEffect, useMemo, useState } from 'react'
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return undefined
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession)
        setLoading(false)
      }
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) console.error('Session restoration failed:', error)
      setSession(data?.session ?? null)
      setLoading(false)
    }).catch((error) => {
      if (!active) return
      console.error('Session restoration failed:', error)
      setLoading(false)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    configured: isSupabaseConfigured,
    async signOut() {
      if (!supabase) throw getSupabaseConfigError()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
  }), [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

