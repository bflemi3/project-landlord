import type { ExternalCallResult, ExternalCallError, ExternalCallOptions, ExternalFetchOptions } from './types'
import { createClient } from '@supabase/supabase-js'

let _serviceClient: ReturnType<typeof createClient> | null = null

function getServiceClient() {
  if (!_serviceClient) {
    _serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _serviceClient
}

/**
 * Wrap any async function as a monitored external call.
 * Captures duration, normalizes errors, logs to DB, and provides a uniform result shape.
 *
 * Usage:
 *   const result = await externalCall({
 *     service: 'brasilapi',
 *     operation: 'cnpj-lookup',
 *     fn: async () => fetchSomething(),
 *   })
 */
export async function externalCall<T>(options: ExternalCallOptions & { fn: () => Promise<T> }): Promise<ExternalCallResult<T>> {
  const start = Date.now()
  const timestamp = new Date().toISOString()

  try {
    const data = await options.fn()
    const duration = Date.now() - start
    logCall({ service: options.service, operation: options.operation, success: true, duration })
    return {
      success: true,
      data,
      duration,
      service: options.service,
      operation: options.operation,
      timestamp,
    }
  } catch (err) {
    const duration = Date.now() - start
    const error = normalizeError(err, options.service, options.operation)
    logCall({ service: options.service, operation: options.operation, success: false, duration, error })
    return {
      success: false,
      error,
      duration,
      service: options.service,
      operation: options.operation,
      timestamp,
    }
  }
}

/**
 * Convenience wrapper for external fetch calls.
 * Handles HTTP status categorization, JSON parsing, and optional shape validation.
 */
export async function externalFetch<T = unknown>(options: ExternalFetchOptions): Promise<ExternalCallResult<T>> {
  return externalCall<T>({
    service: options.service,
    operation: options.operation,
    fn: async () => {
      const controller = new AbortController()
      const timeoutMs = options.timeout ?? 10000
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(options.url, {
          ...options.init,
          signal: controller.signal,
        })

        if (!response.ok) {
          const category = response.status >= 500 ? 'server_error' : 'client_error'
          const error: ExternalCallError = {
            category,
            statusCode: response.status,
            message: `${options.service} returned ${response.status}`,
            service: options.service,
            operation: options.operation,
          }
          throw Object.assign(new Error(error.message), { __externalError: error })
        }

        const data = await response.json()

        if (options.validateShape && !options.validateShape(data)) {
          const error: ExternalCallError = {
            category: 'unexpected_shape',
            message: `${options.service} returned an unexpected response shape`,
            service: options.service,
            operation: options.operation,
          }
          throw Object.assign(new Error(error.message), { __externalError: error })
        }

        return data as T
      } finally {
        clearTimeout(timeoutId)
      }
    },
  })
}

function normalizeError(err: unknown, service: string, operation: string): ExternalCallError {
  // If it's already a normalized error from externalFetch
  if (err && typeof err === 'object' && '__externalError' in err) {
    return (err as { __externalError: ExternalCallError }).__externalError
  }

  // Abort errors (timeout)
  if (err instanceof DOMException && err.name === 'AbortError') {
    return { category: 'timeout', message: `${service} request timed out`, service, operation }
  }

  // Network errors (TypeError: fetch failed)
  if (err instanceof TypeError) {
    return { category: 'network', message: err.message, service, operation }
  }

  // Generic errors
  if (err instanceof Error) {
    return { category: 'unknown', message: err.message, service, operation }
  }

  return { category: 'unknown', message: String(err), service, operation }
}

/**
 * Log an external call (success or failure) to the external_call_log table.
 * Fire-and-forget — logging failures should not break the calling code.
 */
function logCall(entry: {
  service: string
  operation: string
  success: boolean
  duration: number
  error?: ExternalCallError
}): void {
  try {
    const supabase = getServiceClient()
    supabase
      .from('external_call_log')
      .insert({
        service: entry.service,
        operation: entry.operation,
        success: entry.success,
        duration_ms: entry.duration,
        error_category: entry.error?.category ?? null,
        error_message: entry.error?.message ?? null,
        status_code: entry.error?.statusCode ?? null,
      })
      .then(({ error }) => {
        if (error) console.error('[external_call_log] Failed to log:', error.message)
      })
      .catch((err) => {
        console.error('[external_call_log] Unexpected error:', err)
      })
  } catch (err) {
    console.error('[external_call_log] Failed to create client:', err)
  }
}
