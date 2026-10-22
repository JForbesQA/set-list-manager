import { useEffect, useState } from 'react'

/**
 * `migrate` turns whatever was stored (possibly from an older app version) into a valid value.
 */
export function useLocalStorage<T>(key: string, initial: T, migrate?: (raw: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return initial
      const parsed: unknown = JSON.parse(raw)
      return migrate ? migrate(parsed) : (parsed as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage unavailable (private mode / quota): keep working in memory
    }
  }, [key, value])

  return [value, setValue] as const
}
