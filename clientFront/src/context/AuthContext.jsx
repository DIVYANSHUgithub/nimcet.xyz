import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../lib/supabase'
import { createBackendApi } from '../lib/backendApi'
import { AuthContext } from './auth-context'

const guestThemeKey = 'nimcet.guestTheme'
const deviceCheckIntervalMs = 10000
const checkDevice = createBackendApi({ getToken: () => null, timeoutMs: 8000 })

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [deviceSessionMessage, setDeviceSessionMessage] = useState('')
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
    let candidate = null
    let registered = false
    let inFlight = null
    let startTimer

    async function verifyDevice() {
      if (!candidate || inFlight) return
      const controller = new AbortController()
      inFlight = controller
      try {
        await checkDevice('auth/device', {
          method: registered ? 'GET' : 'POST',
          // Older API deployments require a JSON body for this route.
          body: registered ? undefined : { replace: false },
          accessToken: candidate.access_token,
          signal: controller.signal,
        })
        if (inFlight !== controller) return
        if (!registered) setDeviceSessionMessage('')
        registered = true
        setSession(candidate)
        setLoading(false)
      } catch (error) {
        if (inFlight !== controller) return
        if (['device_slot_conflict', 'device_session_required', 'account_suspended'].includes(error.code)) {
          candidate = null
          registered = false
          setSession(null)
          setLoading(false)
          setDeviceSessionMessage(error.message)
          try {
            const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
            if (signOutError) console.error('Device sign-out failed:', signOutError)
          } catch (signOutError) {
            console.error('Device sign-out failed:', signOutError)
          }
        } else if (!registered) {
          setLoading(false)
          setDeviceSessionMessage('Your sign-in could not be verified. We’ll retry automatically.')
        }
      } finally {
        if (inFlight === controller) inFlight = null
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const sameToken = nextSession && nextSession.access_token === candidate?.access_token
      if (sameToken) {
        candidate = nextSession
        if (registered) setSession(nextSession)
        return
      }
      clearTimeout(startTimer)
      inFlight?.abort()
      inFlight = null
      registered = registered && nextSession?.user.id === candidate?.user.id
        && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
      candidate = nextSession
      if (!nextSession || registered) {
        setSession(nextSession)
        setLoading(false)
      } else {
        setSession(null)
        setLoading(true)
      }
      // Start verification after Supabase releases its auth callback lock.
      if (nextSession) startTimer = setTimeout(verifyDevice, 0)
    })
    const interval = setInterval(verifyDevice, deviceCheckIntervalMs)
    window.addEventListener('focus', verifyDevice)
    window.addEventListener('online', verifyDevice)
    window.addEventListener('nimcet-device-conflict', verifyDevice)
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') void verifyDevice()
    }
    document.addEventListener('visibilitychange', checkWhenVisible)
    return () => {
      subscription.unsubscribe()
      clearTimeout(startTimer)
      clearInterval(interval)
      inFlight?.abort()
      inFlight = null
      window.removeEventListener('focus', verifyDevice)
      window.removeEventListener('online', verifyDevice)
      window.removeEventListener('nimcet-device-conflict', verifyDevice)
      document.removeEventListener('visibilitychange', checkWhenVisible)
    }
  }, [])

  const value = useMemo(() => ({
    session,
    user,
    theme,
    loading,
    deviceSessionMessage,
    setDeviceSessionMessage,
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
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    },
  }), [session, user, theme, loading, deviceSessionMessage])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

