/**
 * @file stores/uiStore.ts
 * @description Zustand store for UI state management
 *
 * Handles:
 * - Global loading states
 * - Modal open/close states
 * - Toast notifications
 * - Sidebar visibility
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * Modal types
 */
export type ModalType =
  | 'confirmDelete'
  | 'prizeForm'
  | 'importPreview'
  | 'winnerList'
  | null

/**
 * Modal data based on type
 */
interface ModalData {
  confirmDelete?: {
    title: string
    message: string
    onConfirm: () => void
  }
  prizeForm?: {
    prizeId?: string // undefined for new prize
  }
  importPreview?: {
    file: File
  }
  winnerList?: {
    prizeId: string
    prizeName: string
  }
}

/**
 * UI store state interface
 */
interface UIStoreState {
  // Loading states
  isLoading: boolean
  loadingMessage: string | null

  // Modal state
  activeModal: ModalType
  modalData: ModalData

  // Sidebar state (for draw screen)
  isSidebarOpen: boolean

  // Actions - Loading
  setLoading: (isLoading: boolean, message?: string) => void
  clearLoading: () => void

  // Actions - Modal
  openModal: <T extends ModalType>(
    type: T,
    data?: T extends keyof ModalData ? ModalData[T] : never
  ) => void
  closeModal: () => void

  // Actions - Sidebar
  toggleSidebar: () => void
  setSidebarOpen: (isOpen: boolean) => void
}

/**
 * UI store for managing global UI state
 */
export const useUIStore = create<UIStoreState>()(
  devtools(
    (set) => ({
      // Initial state
      isLoading: false,
      loadingMessage: null,
      activeModal: null,
      modalData: {},
      isSidebarOpen: true,

      // Loading actions
      setLoading: (isLoading, message) =>
        set({
          isLoading,
          loadingMessage: message || null,
        }),

      clearLoading: () =>
        set({
          isLoading: false,
          loadingMessage: null,
        }),

      // Modal actions
      openModal: (type, data) =>
        set({
          activeModal: type,
          modalData: data ? { [type as string]: data } : {},
        }),

      closeModal: () =>
        set({
          activeModal: null,
          modalData: {},
        }),

      // Sidebar actions
      toggleSidebar: () =>
        set((state) => ({
          isSidebarOpen: !state.isSidebarOpen,
        })),

      setSidebarOpen: (isOpen) =>
        set({
          isSidebarOpen: isOpen,
        }),
    }),
    { name: 'ui-store' }
  )
)

export default useUIStore
