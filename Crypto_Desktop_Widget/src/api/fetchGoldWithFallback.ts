/**
 * Lấy bảng giá vàng với: timeout, retry, nguồn dự phòng, cache localStorage.
 */

export const GOLD_PRICES_CACHE_KEY = 'gold-prices-cache-v1'

const PRIMARY_URL = 'https://www.vang.today/api/prices'
/** Cùng kiểu JSON với vang.today (Bảo Tín / niêm yết — nguồn dự phòng) */
const SECONDARY_URL = 'https://giavang.now/api/prices'

const TIMEOUT_MS = 4500
const RETRIES_PER_URL = 3
const RETRY_BASE_DELAY_MS = 350

export type GoldApiPriceRow = {
  name: string
  buy: number
  sell: number
  change_buy: number
  change_sell: number
  currency: string
}

export type GoldPricesMap = Record<string, GoldApiPriceRow>

export type GoldFetchSource = 'primary' | 'secondary' | 'cache'

export type GoldFetchOk = {
  ok: true
  prices: GoldPricesMap
  date?: string
  time?: string
  timestamp?: number
  source: GoldFetchSource
  /** true nếu đọc từ localStorage sau khi mạng lỗi */
  fromCache: boolean
  /** Hiển thị cảnh báo nhẹ (nguồn phụ / cache) */
  warning: string | null
}

export type GoldFetchErr = {
  ok: false
  prices: null
  error: string
  fromCache: false
  warning: null
}

export type GoldFetchResult = GoldFetchOk | GoldFetchErr

type CachedPayload = {
  v: 1
  savedAt: number
  prices: GoldPricesMap
  date?: string
  time?: string
  timestamp?: number
  sourceLabel: string
}

type RawApiBody = {
  date?: string
  time?: string
  timestamp?: number
  prices?: Record<string, GoldApiPriceRow>
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function isValidPayload(data: unknown): data is RawApiBody {
  if (!data || typeof data !== 'object') return false
  const prices = (data as RawApiBody).prices
  if (!prices || typeof prices !== 'object') return false
  return Object.keys(prices).length > 0
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController()
  const id = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return (await res.json()) as T
  } finally {
    window.clearTimeout(id)
  }
}

async function fetchUrlWithRetries(url: string, context: string): Promise<RawApiBody> {
  let lastMessage = 'Unknown error'
  for (let attempt = 0; attempt < RETRIES_PER_URL; attempt++) {
    try {
      const data = await fetchJsonWithTimeout<unknown>(url, TIMEOUT_MS)
      if (!isValidPayload(data)) {
        throw new Error('Payload không hợp lệ')
      }
      return data
    } catch (e) {
      lastMessage =
        e instanceof Error
          ? e.name === 'AbortError'
            ? 'Timeout'
            : e.message
          : String(e)
      if (attempt < RETRIES_PER_URL - 1) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt)
      }
    }
  }
  throw new Error(`${context}: ${lastMessage}`)
}

function normalizePrices(body: RawApiBody): GoldPricesMap {
  return body.prices ?? {}
}

function saveCache(
  body: RawApiBody,
  sourceLabel: string,
): void {
  try {
    const payload: CachedPayload = {
      v: 1,
      savedAt: Date.now(),
      prices: normalizePrices(body),
      date: body.date,
      time: body.time,
      timestamp: body.timestamp,
      sourceLabel,
    }
    localStorage.setItem(GOLD_PRICES_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadGoldPricesCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(GOLD_PRICES_CACHE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as CachedPayload
    if (p.v !== 1 || !p.prices || typeof p.prices !== 'object') return null
    if (Object.keys(p.prices).length === 0) return null
    return p
  } catch {
    return null
  }
}

/**
 * Thử vang.today → giavang.now (retry + timeout mỗi URL) → cache localStorage.
 */
export async function fetchGoldWithFallback(): Promise<GoldFetchResult> {
  const tryNetwork = async (
    url: string,
    source: GoldFetchSource,
    sourceLabel: string,
  ): Promise<GoldFetchOk | null> => {
    try {
      const body = await fetchUrlWithRetries(url, sourceLabel)
      saveCache(body, sourceLabel)
      return {
        ok: true,
        prices: normalizePrices(body),
        date: body.date,
        time: body.time,
        timestamp: body.timestamp,
        source,
        fromCache: false,
        warning:
          source === 'secondary'
            ? 'Đang dùng nguồn dự phòng (giavang.now).'
            : null,
      }
    } catch {
      return null
    }
  }

  const primary = await tryNetwork(PRIMARY_URL, 'primary', 'vang.today')
  if (primary) return primary

  const secondary = await tryNetwork(SECONDARY_URL, 'secondary', 'giavang.now')
  if (secondary) return secondary

  const cached = loadGoldPricesCache()
  if (cached) {
    const ageMin = Math.round((Date.now() - cached.savedAt) / 60_000)
    return {
      ok: true,
      prices: cached.prices,
      date: cached.date,
      time: cached.time,
      timestamp: cached.timestamp,
      source: 'cache',
      fromCache: true,
      warning: `Không tải được mạng. Hiển thị dữ liệu đã lưu (${cached.sourceLabel}, ~${ageMin} phút trước).`,
    }
  }

  return {
    ok: false,
    prices: null,
    error:
      'Không kết nối được nguồn giá vàng và chưa có dữ liệu cache.',
    fromCache: false,
    warning: null,
  }
}
