/**
 * Global type declarations for modal module
 */

interface Window {
  modal: {
    open: (id: string, data?: Record<string, unknown>) => void
    close: () => void
  }
}
