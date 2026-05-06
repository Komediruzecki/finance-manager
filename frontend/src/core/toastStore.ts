/**
 * Shared toast store — signal-based, no DOM manipulation needed
 */
import { createRoot, createSignal } from 'solid-js'

export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

let nextId = 0

const { toasts, setToasts } = createRoot(() => {
  const [toasts, setToasts] = createSignal<ToastItem[]>([])
  return { toasts, setToasts }
})

export { toasts }

export function addToast(message: string, type: ToastItem['type'] = 'info'): void {
  const id = ++nextId
  setToasts((prev) => [...prev, { id, message, type }])
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, 4000)
}
