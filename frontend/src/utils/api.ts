import { apiFetch } from '../core/apiFetch'

/**
 * API Utilities
 * Centralized fetch helpers with error handling
 */

export interface ApiError {
  error: string
  details?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Default fetch options
function getProfileHeader() {
  const id = localStorage.getItem('currentProfileId')
  return (id !== null ? parseInt(id, 10) : 1).toString()
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Profile-Id': getProfileHeader(),
  }
}

const DEFAULT_FETCH_OPTIONS = {
  credentials: 'include' as RequestCredentials,
}

/**
 * Check if response indicates an error
 */
function checkResponseStatus(response: Response): void {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
}

/**
 * Parse JSON response with error handling
 */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type')
  if (contentType !== null && contentType.includes('application/json')) {
    const data = (await response.json()) as T
    if (!response.ok) {
      const errorData = data as ApiError | undefined
      throw new Error(
        (errorData?.error ?? '') !== ''
          ? errorData?.error
          : `Request failed with status ${response.status}`
      )
    }
    return data
  }
  throw new Error('Invalid response format')
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(url: string): Promise<T> {
  const response = await apiFetch(url, {
    ...DEFAULT_FETCH_OPTIONS,
    method: 'GET',
    headers: getHeaders(),
  })
  checkResponseStatus(response)
  return parseJsonResponse<T>(response)
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(
  url: string,
  body: unknown,
  options?: RequestInit
): Promise<T> {
  const response = await apiFetch(url, {
    ...DEFAULT_FETCH_OPTIONS,
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    ...options,
  })
  checkResponseStatus(response)
  return parseJsonResponse<T>(response)
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(
  url: string,
  body: unknown,
  options?: RequestInit
): Promise<T> {
  const response = await apiFetch(url, {
    ...DEFAULT_FETCH_OPTIONS,
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
    ...options,
  })
  checkResponseStatus(response)
  return parseJsonResponse<T>(response)
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(url: string): Promise<T> {
  const response = await apiFetch(url, {
    ...DEFAULT_FETCH_OPTIONS,
    method: 'DELETE',
    headers: getProfileHeader() !== '1' ? { 'X-Profile-Id': getProfileHeader() } : {},
  })
  checkResponseStatus(response)
  return parseJsonResponse<T>(response)
}

import { addToast } from '../core/toastStore'

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  addToast(message, type === 'error' ? 'error' : type === 'success' ? 'success' : 'info')
}
