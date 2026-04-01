export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type FetchWithRetryOptions = {
  maxRetries?: number
  baseDelayMs?: number
}

/**
 * Fetch with exponential backoff. Retries on network failure / 5xx.
 * Does not retry 4xx (except 429 once as transient).
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3
  const baseDelayMs = options.baseDelayMs ?? 1000
  let lastErr: unknown
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(input, init)
      if (res.ok) return res
      const retry =
        res.status >= 500 ||
        res.status === 429 ||
        res.status === 408
      if (!retry || i === maxRetries - 1) return res
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (e) {
      lastErr = e
      if (i === maxRetries - 1) throw e
    }
    await delay(Math.min(30_000, baseDelayMs * 2 ** i))
  }
  throw lastErr instanceof Error ? lastErr : new Error('Fetch failed')
}
