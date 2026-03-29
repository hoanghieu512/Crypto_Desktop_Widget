/**
 * Giá bạc spot thế giới: timeout 8s, backoff, 2 nguồn, cache localStorage (silver-cache).
 */

import {
  fetchWithBackoff,
  isBrowserOffline,
} from '../utils/fetchResilience'
import { warnFetchSource } from '../utils/fetchErrors'

export const SILVER_CACHE_KEY = 'silver-cache'

/** @deprecated Chỉ đọc migrate */
export const SILVER_WORLD_CACHE_KEY = 'silver-world-cache-v1'

const PRIMARY_URL = 'https://api.gold-api.com/price/XAG'
const SECONDARY_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1d&range=1d'

export const SILVER_WORLD_HALF_SPREAD_USD_PER_OZ = 0.035

const TIMEOUT_MS = 8000

const YAHOO_UA =
  'Mozilla/5.0 (compatible; CryptoWidget/1.0; +https://localhost)'

export type SilverWorldFetchSource = 'gold-api' | 'yahoo' | 'cache'

export type SilverWorldOk = {
  ok: true
  midUsdPerOz: number
  buyUsdPerOz: number
  sellUsdPerOz: number
  source: SilverWorldFetchSource
  fromCache: boolean
  isStale: boolean
  cachedAt: number
  warning: string | null
}

export type SilverWorldErr = {
  ok: false
  midUsdPerOz: null
  buyUsdPerOz: null
  sellUsdPerOz: null
  error: string
  fromCache: false
  isStale: false
  cachedAt: null
  warning: null
}

export type SilverWorldResult = SilverWorldOk | SilverWorldErr

export type SilverCachePayload = {
  v: 1
  savedAt: number
  midUsdPerOz: number
  buyUsdPerOz: number
  sellUsdPerOz: number
  source: SilverWorldFetchSource
  sourceLabel: string
}

type GoldApiXag = { price?: number }

type YahooChart = {
  chart?: {
    result?: Array<{ meta?: { regularMarketPrice?: number } }>
  }
}

function midToBidAsk(mid: number): { buy: number; sell: number } {
  const h = SILVER_WORLD_HALF_SPREAD_USD_PER_OZ
  return { buy: mid - h, sell: mid + h }
}

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<T> {
  const ctrl = new AbortController()
  const id = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    window.clearTimeout(id)
  }
}

async function tryGoldApiOnce(): Promise<number | null> {
  try {
    const data = await fetchJsonWithTimeout<unknown>(PRIMARY_URL, TIMEOUT_MS)
    const p = (data as GoldApiXag).price
    if (typeof p === 'number' && Number.isFinite(p) && p > 0) return p
    console.warn(
      '[fetch:silver:gold-api XAG] invalid_payload: missing or non-positive price',
    )
    return null
  } catch (e) {
    warnFetchSource('silver:gold-api XAG', 'attempt', e)
    return null
  }
}

async function tryYahooOnce(): Promise<number | null> {
  try {
    const data = await fetchJsonWithTimeout<YahooChart>(
      SECONDARY_URL,
      TIMEOUT_MS,
      { headers: { 'User-Agent': YAHOO_UA } },
    )
    const mid = data.chart?.result?.[0]?.meta?.regularMarketPrice
    if (typeof mid === 'number' && Number.isFinite(mid) && mid > 0) return mid
    console.warn(
      '[fetch:silver:Yahoo SI=F] invalid_payload: no regularMarketPrice in chart',
    )
    return null
  } catch (e) {
    warnFetchSource('silver:Yahoo SI=F', 'attempt', e)
    return null
  }
}

function saveSilverCache(
  mid: number,
  source: SilverWorldFetchSource,
  sourceLabel: string,
): void {
  try {
    const { buy, sell } = midToBidAsk(mid)
    const payload: SilverCachePayload = {
      v: 1,
      savedAt: Date.now(),
      midUsdPerOz: mid,
      buyUsdPerOz: buy,
      sellUsdPerOz: sell,
      source,
      sourceLabel,
    }
    localStorage.setItem(SILVER_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

function parseSilverPayload(raw: string): SilverCachePayload | null {
  try {
    const p = JSON.parse(raw) as SilverCachePayload | Record<string, unknown>
    if (p.v !== 1 || typeof p.savedAt !== 'number') return null
    const mid = p.midUsdPerOz
    if (typeof mid !== 'number' || !Number.isFinite(mid) || mid <= 0) return null
    const buy =
      typeof p.buyUsdPerOz === 'number' && Number.isFinite(p.buyUsdPerOz)
        ? p.buyUsdPerOz
        : midToBidAsk(mid).buy
    const sell =
      typeof p.sellUsdPerOz === 'number' && Number.isFinite(p.sellUsdPerOz)
        ? p.sellUsdPerOz
        : midToBidAsk(mid).sell
    const source =
      p.source === 'gold-api' || p.source === 'yahoo' || p.source === 'cache'
        ? p.source
        : 'cache'
    const sourceLabel = typeof p.sourceLabel === 'string' ? p.sourceLabel : 'cache'
    return {
      v: 1,
      savedAt: p.savedAt,
      midUsdPerOz: mid,
      buyUsdPerOz: buy,
      sellUsdPerOz: sell,
      source,
      sourceLabel,
    }
  } catch {
    return null
  }
}

export function loadSilverWorldCache(): SilverCachePayload | null {
  for (const key of [SILVER_CACHE_KEY, SILVER_WORLD_CACHE_KEY]) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = parseSilverPayload(raw)
      if (parsed) return parsed
    } catch {
      /* ignore */
    }
  }
  return null
}

function okFromCachePayload(
  payload: SilverCachePayload,
  warning: string,
): SilverWorldOk {
  return {
    ok: true,
    midUsdPerOz: payload.midUsdPerOz,
    buyUsdPerOz: payload.buyUsdPerOz,
    sellUsdPerOz: payload.sellUsdPerOz,
    source: 'cache',
    fromCache: true,
    isStale: true,
    cachedAt: payload.savedAt,
    warning,
  }
}

function okFromMid(
  mid: number,
  source: SilverWorldFetchSource,
  fromCache: boolean,
  isStale: boolean,
  cachedAt: number,
  warning: string | null,
): SilverWorldOk {
  const { buy, sell } = midToBidAsk(mid)
  return {
    ok: true,
    midUsdPerOz: mid,
    buyUsdPerOz: buy,
    sellUsdPerOz: sell,
    source,
    fromCache,
    isStale,
    cachedAt,
    warning,
  }
}

export async function fetchSilverWorldWithFallback(): Promise<SilverWorldResult> {
  if (isBrowserOffline()) {
    const cached = loadSilverWorldCache()
    if (cached) {
      const ageMin = Math.max(1, Math.round((Date.now() - cached.savedAt) / 60_000))
      return okFromCachePayload(
        cached,
        `Ngoại tuyến — spot bạc từ cache (${cached.sourceLabel}, ~${ageMin} phút trước).`,
      )
    }
    return {
      ok: false,
      midUsdPerOz: null,
      buyUsdPerOz: null,
      sellUsdPerOz: null,
      error: 'Ngoại tuyến và chưa có cache giá bạc.',
      fromCache: false,
      isStale: false,
      cachedAt: null,
      warning: null,
    }
  }

  const primary = await fetchWithBackoff(
    () => tryGoldApiOnce(),
    (n): n is number => typeof n === 'number' && n > 0,
  )
  if (primary != null) {
    saveSilverCache(primary, 'gold-api', 'gold-api.com (XAG)')
    const now = Date.now()
    return okFromMid(primary, 'gold-api', false, false, now, null)
  }

  const secondary = await fetchWithBackoff(
    () => tryYahooOnce(),
    (n): n is number => typeof n === 'number' && n > 0,
  )
  if (secondary != null) {
    saveSilverCache(secondary, 'yahoo', 'Yahoo SI=F (COMEX)')
    const now = Date.now()
    return okFromMid(
      secondary,
      'yahoo',
      false,
      false,
      now,
      'Đang dùng nguồn dự phòng (Yahoo COMEX SI=F).',
    )
  }

  const cached = loadSilverWorldCache()
  if (cached) {
    const ageMin = Math.max(1, Math.round((Date.now() - cached.savedAt) / 60_000))
    return okFromCachePayload(
      cached,
      `Không tải được mạng. Spot bạc từ cache (${cached.sourceLabel}, ~${ageMin} phút trước).`,
    )
  }

  return {
    ok: false,
    midUsdPerOz: null,
    buyUsdPerOz: null,
    sellUsdPerOz: null,
    error: 'Không lấy được giá bạc thế giới và chưa có cache.',
    fromCache: false,
    isStale: false,
    cachedAt: null,
    warning: null,
  }
}
