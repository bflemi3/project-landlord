/**
 * Normalized result from any external dependency call.
 * Every external call returns this shape, regardless of the service.
 */
export interface ExternalCallResult<T> {
  success: boolean
  data?: T
  error?: ExternalCallError
  /** Time taken in milliseconds */
  duration: number
  service: string
  operation: string
  timestamp: string           // ISO 8601
}

export interface ExternalCallError {
  /** Normalized error category */
  category: 'timeout' | 'network' | 'client_error' | 'server_error' | 'unexpected_shape' | 'unknown'
  /** HTTP status code if applicable */
  statusCode?: number
  /** Original error message */
  message: string
  /** The service and operation that failed */
  service: string
  operation: string
}

export interface ExternalCallOptions {
  /** Which external service (e.g., 'brasilapi', 'receitaws', 'enliv-api') */
  service: string
  /** What operation (e.g., 'cnpj-lookup', 'fetch-debitos') */
  operation: string
  /** The async function to execute */
  fn: () => Promise<unknown>
}

export interface ExternalFetchOptions {
  /** Which external service (e.g., 'brasilapi', 'receitaws', 'enliv-api') */
  service: string
  /** What operation (e.g., 'cnpj-lookup', 'fetch-debitos') */
  operation: string
  /** The URL to fetch */
  url: string
  /** Optional fetch init (method, headers, body, etc.) */
  init?: RequestInit
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number
  /** Optional: validate the response shape. Return true if valid. */
  validateShape?: (data: unknown) => boolean
}
