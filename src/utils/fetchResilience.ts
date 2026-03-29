/** Khoảng cách giữa các lần thử lại sau khi lỗi: 5s → 15s → 30s → 60s (tối đa 5 lần gọi mạng) */
export const STALE_FETCH_BACKOFF_MS = [5000, 15_000, 30_000, 60_000] as const

export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Gọi `attempt` lặp lại: lần đầu ngay, sau đó chờ từng mốc trong STALE_FETCH_BACKOFF_MS.
 * Trả về kết quả đầu tiên thỏa `validate`, hoặc null.
 */
export async function fetchWithBackoff<T>(
  attempt: () => Promise<T | null | undefined>,
  validate: (v: T) => boolean,
): Promise<T | null> {
  for (let i = 0; i <= STALE_FETCH_BACKOFF_MS.length; i++) {
    if (i > 0) await sleep(STALE_FETCH_BACKOFF_MS[i - 1])
    try {
      const r = await attempt()
      if (r != null && validate(r as T)) return r as T
    } catch {
      /* tiếp tục backoff */
    }
  }
  return null
}
