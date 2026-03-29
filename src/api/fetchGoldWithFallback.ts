/**
 * Lấy bảng giá vàng: timeout 8s, backoff (5s→15s→30s→60s), nguồn dự phòng,
 * cache localStorage (gold-cache + vn-metal-cache).
 */

import {
  fetchWithBackoff,
  isBrowserOffline,
} from '../utils/fetchResilience'
import { warnFetchSource } from '../utils/fetchErrors'

/** Cache chính (đồng bộ với yêu cầu product) */
export const GOLD_CACHE_KEY = 'gold-cache'
export const VN_METAL_CACHE_KEY = 'vn-metal-cache'
/** @deprecated Chỉ đọc để migrate; không ghi nữa */
export const LEGACY_GOLD_CACHE_KEY = 'gold-prices-cache-v1'

/** @deprecated — dùng GOLD_CACHE_KEY */
export const GOLD_PRICES_CACHE_KEY = LEGACY_GOLD_CACHE_KEY

const PRIMARY_URL = 'https://www.vang.today/api/prices'
const SECONDARY_URL = 'https://giavang.now/api/prices'

const TIMEOUT_MS = 8000

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
  fromCache: boolean
  isStale: boolean
  cachedAt: number
  warning: string | null
}

export type GoldFetchErr = {
  ok: false
  prices: null
  error: string
  fromCache: false
  isStale: false
  cachedAt: null
  warning: null
}

export type GoldFetchResult = GoldFetchOk | GoldFetchErr

export type GoldCachePayload = {
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

async function fetchUrlBodyWithBackoff(
  url: string,
  sourceLabel: string,
): Promise<RawApiBody | null> {
  const logKey = `gold:${sourceLabel}`
  return fetchWithBackoff(
    async () => {
      try {
        const data = await fetchJsonWithTimeout<unknown>(url, TIMEOUT_MS)
        if (!isValidPayload(data)) {
          console.warn(
            `[fetch:${logKey}] invalid_payload: object missing or empty prices`,
          )
          return null
        }
        return data
      } catch (e) {
        warnFetchSource(logKey, 'attempt', e)
        return null
      }
    },
    (b): b is RawApiBody => b != null,
  )
}

function normalizePrices(body: RawApiBody): GoldPricesMap {
  return body.prices ?? {}
}

function saveGoldCaches(body: RawApiBody, sourceLabel: string): void {
  try {
    const payload: GoldCachePayload = {
      v: 1,
      savedAt: Date.now(),
      prices: normalizePrices(body),
      date: body.date,
      time: body.time,
      timestamp: body.timestamp,
      sourceLabel,
    }
    const raw = JSON.stringify(payload)
    localStorage.setItem(GOLD_CACHE_KEY, raw)
    localStorage.setItem(VN_METAL_CACHE_KEY, raw)
  } catch {
    /* ignore quota / private mode */
  }
}

function parseStoredPayload(raw: string): GoldCachePayload | null {
  try {
    const p = JSON.parse(raw) as GoldCachePayload
    if (p.v !== 1 || !p.prices || typeof p.prices !== 'object') return null
    if (Object.keys(p.prices).length === 0) return null
    if (typeof p.savedAt !== 'number') return null
    return p
  } catch {
    return null
  }
}

/**
 * Đọc cache: gold-cache → vn-metal-cache → legacy key.
 */
export function loadGoldPricesCache(): GoldCachePayload | null {
  for (const key of [GOLD_CACHE_KEY, VN_METAL_CACHE_KEY, LEGACY_GOLD_CACHE_KEY]) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const p = parseStoredPayload(raw)
      if (p) return p
    } catch {
      /* ignore */
    }
  }
  return null
}

function staleWarningFromCache(cached: GoldCachePayload): string {
  const ageMin = Math.max(1, Math.round((Date.now() - cached.savedAt) / 60_000))
  return `Không tải được mạng. Hiển thị dữ liệu đã lưu (${cached.sourceLabel}, ~${ageMin} phút trước).`
}

function okFromCachePayload(
  payload: GoldCachePayload,
  warning: string | null,
): GoldFetchOk {
  return {
    ok: true,
    prices: payload.prices,
    date: payload.date,
    time: payload.time,
    timestamp: payload.timestamp,
    source: 'cache',
    fromCache: true,
    isStale: true,
    cachedAt: payload.savedAt,
    warning,
  }
}

export async function fetchGoldWithFallback(): Promise<GoldFetchResult> {
  if (isBrowserOffline()) {
    const cached = loadGoldPricesCache()
    if (cached) {
      return okFromCachePayload(cached, staleWarningFromCache(cached))
    }
    return {
      ok: false,
      prices: null,
      error: 'Ngoại tuyến và chưa có cache giá vàng.',
      fromCache: false,
      isStale: false,
      cachedAt: null,
      warning: null,
    }
  }

  const tryNetwork = async (
    url: string,
    source: GoldFetchSource,
    sourceLabel: string,
  ): Promise<GoldFetchOk | null> => {
    const body = await fetchUrlBodyWithBackoff(url, sourceLabel)
    if (!body) return null
    saveGoldCaches(body, sourceLabel)
    const now = Date.now()
    return {
      ok: true,
      prices: normalizePrices(body),
      date: body.date,
      time: body.time,
      timestamp: body.timestamp,
      source,
      fromCache: false,
      isStale: false,
      cachedAt: now,
      warning:
        source === 'secondary'
          ? 'Đang dùng nguồn dự phòng (giavang.now).'
          : null,
    }
  }

  const primary = await tryNetwork(PRIMARY_URL, 'primary', 'vang.today')
  if (primary) return primary

  const secondary = await tryNetwork(SECONDARY_URL, 'secondary', 'giavang.now')
  if (secondary) return secondary

  const cached = loadGoldPricesCache()
  if (cached) {
    return okFromCachePayload(cached, staleWarningFromCache(cached))
  }

  return {
    ok: false,
    prices: null,
    error: 'Không kết nối được nguồn giá vàng và chưa có dữ liệu cache.',
    fromCache: false,
    isStale: false,
    cachedAt: null,
    warning: null,
  }
}
