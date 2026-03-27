import { useRef, useCallback } from 'react'

// Module-level audio cache — persists across re-renders and component instances
const audioCache = new Map<string, HTMLAudioElement>()

function getCachedAudio(file: string): HTMLAudioElement {
  let audio = audioCache.get(file)
  if (!audio) {
    audio = new Audio(file)
    audioCache.set(file, audio)
  }
  return audio
}

/**
 * Hook for playing sound effects with caching.
 * All methods accept a file path (or null to skip).
 * - playLoop: loops until stopLoop (rolling sound)
 * - playOnce: one-shot (reveal sound)
 * - preview: one-shot for UI preview, stops previous
 */
export function useSound() {
  const loopRef = useRef<HTMLAudioElement | null>(null)
  const previewRef = useRef<HTMLAudioElement | null>(null)

  const playLoop = useCallback((file: string | null) => {
    if (loopRef.current) {
      loopRef.current.pause()
      loopRef.current.currentTime = 0
      loopRef.current = null
    }
    if (!file) return

    const audio = getCachedAudio(file)
    audio.currentTime = 0
    audio.loop = true
    audio.play().catch(() => {})
    loopRef.current = audio
  }, [])

  const stopLoop = useCallback(() => {
    if (loopRef.current) {
      loopRef.current.pause()
      loopRef.current.currentTime = 0
      loopRef.current = null
    }
  }, [])

  const playOnce = useCallback((file: string | null) => {
    if (!file) return
    // Clone from cache so overlapping plays work
    const cached = getCachedAudio(file)
    const clone = cached.cloneNode() as HTMLAudioElement
    clone.play().catch(() => {})
  }, [])

  const preview = useCallback((file: string | null) => {
    if (previewRef.current) {
      previewRef.current.pause()
      previewRef.current = null
    }
    if (!file) return

    const audio = getCachedAudio(file)
    audio.currentTime = 0
    audio.loop = false
    audio.play().catch(() => {})
    previewRef.current = audio
  }, [])

  const stopPreview = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.pause()
      previewRef.current.currentTime = 0
      previewRef.current = null
    }
  }, [])

  return { playLoop, stopLoop, playOnce, preview, stopPreview }
}
