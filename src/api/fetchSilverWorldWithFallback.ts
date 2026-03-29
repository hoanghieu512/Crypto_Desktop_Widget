/**
 * Giá bạc spot thế giới (USD/tr.oz): timeout, retry, 2 nguồn, cache localStorage.
 */

export const SILVER_WORLD_CACHE_KEY = 'silver-world-cache-v1'

const PRIMARY_URL = 'https://api.gold-api.com/price/XAG'
const SECONDARY_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1d&range=1d'

/** Nửa spread ước lượng quanh mid (USD/oz) — API chỉ trả một giá */
export const SILVER_WORLD_HALF_SPREAD_USD_PER_OZ = 0.035

const TIMEOUT_MS = 4500
const RETRIES_PER_URL = 3
const RETRY_BASE_DELAY_MS = 350

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
  warning: string | null
}

export type SilverWorldErr = {
  ok: false
  midUsdPerOz: null
  buyUsdPerOz: null
  sellUsdPerOz: null
  error: string
  fromCache: false
  warning: null
}

export type SilverWorldResult = SilverWorldOk | SilverWorldErr

type CachedPayload = {
  v: 1
  savedAt: number
  midUsdPerOz: number
  sourceLabel: string
}

type GoldApiXag = { price?: number }

type YahooChart = {
  chart?: {
    result?: Array<{ meta?: { regularMarketPrice?: number } }>
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
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

function midToBidAsk(mid: number): { buy: number; sell: number } {
  const h = SILVER_WORLD_HALF_SPREAD_USD_PER_OZ
  return { buy: mid - h, sell: mid + h }
}

async function tryGoldApi(): Promise<number | null> {
  for (let attempt = 0; attempt < RETRIES_PER_URL; attempt++) {
    try {
      const data = await fetchJsonWithTimeout<unknown>(PRIMARY_URL, TIMEOUT_MS)
      const p = (data as GoldApiXag).price
      if (typeof p === 'number' && Number.isFinite(p) && p > 0) return p
      throw new Error('Giá không hợp lệ')
    } catch {
      if (attempt < RETRIES_PER_URL - 1) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt)
      }
    }
  }
  return null
}

async function tryYahoo(): Promise<number | null> {
  for (let attempt = 0; attempt < RETRIES_PER_URL; attempt++) {
    try {
      const data = await fetchJsonWithTimeout<YahooChart>(
        SECONDARY_URL,
        TIMEOUT_MS,
        { headers: { 'User-Agent': YAHOO_UA } },
      )
      const mid = data.chart?.result?.[0]?.meta?.regularMarketPrice
      if (typeof mid === 'number' && Number.isFinite(mid) && mid > 0) return mid
      throw new Error('Thiếu giá Yahoo')
    } catch {
      if (attempt < RETRIES_PER_URL - 1) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt)
      }
    }
  }
  return null
}

function saveCache(mid: number, sourceLabel: string): void {
  try {
    const payload: CachedPayload = {
      v: 1,
      savedAt: Date.now(),
      midUsdPerOz: mid,
      sourceLabel,
    }
    localStorage.setItem(SILVER_WORLD_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function loadSilverWorldCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(SILVER_WORLD_CACHE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as CachedPayload
    if (p.v !== 1 || typeof p.midUsdPerOz !== 'number' || p.midUsdPerOz <= 0)
      return null
    return p
  } catch {
    return null
  }
}

export async function fetchSilverWorldWithFallback(): Promise<SilverWorldResult> {
  const primary = await tryGoldApi()
  if (primary != null) {
    saveCache(primary, 'gold-api.com (XAG)')
    const { buy, sell } = midToBidAsk(primary)
    return {
      ok: true,
      midUsdPerOz: primary,
      buyUsdPerOz: buy,
      sellUsdPerOz: sell,
      source: 'gold-api',
      fromCache: false,
      warning: null,
    }
  }

  const secondary = await tryYahoo()
  if (secondary != null) {
    saveCache(secondary, 'Yahoo SI=F (COMEX)')
    const { buy, sell } = midToBidAsk(secondary)
    return {
      ok: true,
      midUsdPerOz: secondary,
      buyUsdPerOz: buy,
      sellUsdPerOz: sell,
      source: 'yahoo',
      fromCache: false,
      warning: 'Đang dùng nguồn dự phòng (Yahoo COMEX SI=F).',
    }
  }

  const cached = loadSilverWorldCache()
  if (cached) {
    const ageMin = Math.round((Date.now() - cached.savedAt) / 60_000)
    const { buy, sell } = midToBidAsk(cached.midUsdPerOz)
    return {
      ok: true,
      midUsdPerOz: cached.midUsdPerOz,
      buyUsdPerOz: buy,
      sellUsdPerOz: sell,
      source: 'cache',
      fromCache: true,
      warning: `Không tải được mạng. Spot bạc từ cache (${cached.sourceLabel}, ~${ageMin} phút trước).`,
    }
  }

  return {
    ok: false,
    midUsdPerOz: null,
    buyUsdPerOz: null,
    sellUsdPerOz: null,
    error: 'Không lấy được giá bạc thế giới và chưa có cache.',
    fromCache: false,
    warning: null,
  }
}
