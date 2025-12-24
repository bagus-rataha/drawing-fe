/**
 * @file hooks/useDebounce.ts
 * @description Custom hook for debouncing values
 *
 * Useful for search inputs where you want to delay API calls
 * until the user stops typing.
 */

import { useState, useEffect } from 'react'

/**
 * Debounce a value by a specified delay
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
