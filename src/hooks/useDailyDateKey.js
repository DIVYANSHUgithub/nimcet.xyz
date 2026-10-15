import { useEffect, useState } from 'react'
import { getDailyDateKey } from '../utils/formatDate'

export function useDailyDateKey() {
  const [dateKey, setDateKey] = useState(() => getDailyDateKey())

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextDateKey = getDailyDateKey()
      setDateKey((currentDateKey) => currentDateKey === nextDateKey ? currentDateKey : nextDateKey)
    }, 30_000)

    return () => window.clearInterval(timer)
  }, [])

  return dateKey
}
