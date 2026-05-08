/**
 * Shared confirm dialog store — signal-based, similar to toastStore
 */
import { createRoot, createSignal } from 'solid-js'

export interface ConfirmRequest {
  id: number
  message: string
  resolve: (value: boolean) => void
}

let nextId = 0

const { confirmRequests, setConfirmRequests } = createRoot(() => {
  const [confirmRequests, setConfirmRequests] = createSignal<ConfirmRequest[]>([])
  return { confirmRequests, setConfirmRequests }
})

export { confirmRequests }

export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const id = ++nextId
    setConfirmRequests((prev) => [...prev, { id, message, resolve }])
  })
}

export function resolveConfirm(id: number, value: boolean): void {
  const req = confirmRequests().find((r) => r.id === id)
  if (req) req.resolve(value)
  setConfirmRequests((prev) => prev.filter((r) => r.id !== id))
}
