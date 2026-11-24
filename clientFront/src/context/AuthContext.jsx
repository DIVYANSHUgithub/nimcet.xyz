import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

const guestThemeKey = 'nimcet.guestTheme'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [guestTheme, setGuestTheme] = useState(() => {
    try {
      return window.localStorage.getItem(guestThemeKey) === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })
  const user = session?.user ?? null
  const theme = user ? (user.user_metadata?.theme === 'dark' ? 'dark' : 'light') : guestTheme

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    return () => { delete root.dataset.theme }
  }, [theme])

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
    user,
    theme,
    loading,
    configured: isSupabaseConfigured,
    async toggleTheme() {
      const nextTheme = theme === 'dark' ? 'light' : 'dark'
      if (!user) {
        setGuestTheme(nextTheme)
        try {
          window.localStorage.setItem(guestThemeKey, nextTheme)
        } catch {
          // The current page can still use the selected theme without storage.
        }
        return
      }
      if (!supabase) throw getSupabaseConfigError()
      const { error } = await supabase.auth.updateUser({
        data: { theme: nextTheme },
      })
      if (error) throw error
    },
    async signOut() {
      if (!supabase) throw getSupabaseConfigError()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
  }), [session, user, theme, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

