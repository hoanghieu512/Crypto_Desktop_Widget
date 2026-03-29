/** Phân loại lỗi fetch để console.warn rõ ràng khi debug */

export type FetchFailureKind =
  | 'timeout'
  | 'rate_limit'
  | 'http'
  | 'network'
  | 'parse'
  | 'invalid_payload'
  | 'unknown'

export function classifyFetchError(error: unknown): {
  kind: FetchFailureKind
  message: string
} {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { kind: 'timeout', message: 'timeout (AbortError)' }
  }
  if (error instanceof SyntaxError) {
    return { kind: 'parse', message: `JSON parse: ${error.message}` }
  }
  if (error instanceof TypeError) {
    return { kind: 'network', message: `network: ${error.message}` }
  }
  if (error instanceof Error) {
    const m = error.message
    if (/HTTP\s*429\b/.test(m) || m.includes('429')) {
      return { kind: 'rate_limit', message: m }
    }
    if (/HTTP\s+\d{3}/.test(m)) {
      return { kind: 'http', message: m }
    }
    return { kind: 'unknown', message: m }
  }
  return { kind: 'unknown', message: String(error) }
}

export function warnFetchSource(source: string, context: string, error: unknown): void {
  const { kind, message } = classifyFetchError(error)
  console.warn(`[fetch:${source}] ${context} → ${kind}: ${message}`)
}
