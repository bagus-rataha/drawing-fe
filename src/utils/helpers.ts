/**
 * @file utils/helpers.ts
 * @description Utility helper functions for the Lottery App
 */

/**
 * Generates a unique ID using timestamp and random string
 * @returns Unique string ID
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 9)
  return `${timestamp}-${randomStr}`
}

/**
 * Formats a date to locale string
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('id-ID', options)
}

/**
 * Formats a number with thousand separators
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('id-ID')
}

/**
 * Truncates a string to specified length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

/**
 * Debounces a function call
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Delays execution for specified milliseconds
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - Value to check
 * @returns True if empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Deep clones an object
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Gets file extension from filename
 * @param filename - Filename to parse
 * @returns File extension (lowercase, with dot)
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.substring(lastDot).toLowerCase()
}

/**
 * Converts bytes to human readable size
 * @param bytes - Number of bytes
 * @returns Human readable size string
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let size = bytes

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Calculates weighted random selection
 * @param items - Array of items with weights
 * @param count - Number of items to select
 * @returns Selected items
 *
 * Algorithm:
 * 1. Calculate cumulative weights
 * 2. Generate random number
 * 3. Binary search to find selected item
 * 4. Remove selected item and repeat
 */
export function weightedRandomSelection<T extends { weight: number }>(
  items: T[],
  count: number
): T[] {
  if (items.length === 0 || count <= 0) return []
  if (items.length <= count) return [...items]

  const selected: T[] = []
  const remaining = [...items]

  for (let i = 0; i < count && remaining.length > 0; i++) {
    // Calculate total weight
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0)

    // Generate random value
    let random = Math.random() * totalWeight

    // Find selected item
    let selectedIndex = 0
    for (let j = 0; j < remaining.length; j++) {
      random -= remaining[j].weight
      if (random <= 0) {
        selectedIndex = j
        break
      }
    }

    // Add to selected and remove from remaining
    selected.push(remaining[selectedIndex])
    remaining.splice(selectedIndex, 1)
  }

  return selected
}

/**
 * Groups an array by a key
 * @param items - Array of items
 * @param keyFn - Function to get group key
 * @returns Grouped object
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return items.reduce(
    (groups, item) => {
      const key = keyFn(item)
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
      return groups
    },
    {} as Record<string, T[]>
  )
}

/**
 * Sorts an array by multiple fields
 * @param items - Array of items
 * @param sortFns - Array of sort functions
 * @returns Sorted array
 */
export function multiSort<T>(
  items: T[],
  sortFns: ((a: T, b: T) => number)[]
): T[] {
  return [...items].sort((a, b) => {
    for (const sortFn of sortFns) {
      const result = sortFn(a, b)
      if (result !== 0) return result
    }
    return 0
  })
}

/**
 * Generates a random 4-character confirmation code
 * Uses mix of uppercase, lowercase letters and numbers for case sensitivity
 * @returns 4-character random alphanumeric string
 */
export function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generates a full delete confirmation string
 * Format: [identifier]/[4-char-random]
 * @param identifier - The identifier to prepend (event name, participant ID, coupon ID)
 * @returns Full confirmation string (case sensitive)
 */
export function generateDeleteConfirmation(identifier: string): string {
  return `${identifier}/${generateConfirmationCode()}`
}
