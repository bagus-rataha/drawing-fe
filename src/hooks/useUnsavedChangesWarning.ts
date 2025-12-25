/**
 * @file hooks/useUnsavedChangesWarning.ts
 * @description Hook to warn users before leaving page with unsaved changes
 *
 * Uses the beforeunload event to show browser's native confirmation dialog
 * when user tries to refresh or close the page with unsaved changes.
 */

import { useEffect } from 'react'

/**
 * Hook to prevent accidental page refresh/close when there are unsaved changes
 * @param hasUnsavedChanges - Whether there are unsaved changes
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Prevent the default behavior (closing/refreshing)
        e.preventDefault()
        // Modern browsers ignore custom message, but still show default warning
        // Setting returnValue is required for some browsers
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])
}

export default useUnsavedChangesWarning
