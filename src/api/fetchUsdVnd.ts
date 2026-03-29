import {
  fetchWithBackoff,
  isBrowserOffline,
} from '../utils/fetchResilience'

export const USD_VND_CACHE_KEY = 'usd-vnd-cache-v1'

const USD_VND_PRIMARY = 'https://open.er-api.com/v6/latest/USD'
const USD_VND_FALLBACK = 'https://api.exchangerate.host/latest?base=USD&symbols=VND'
const TIMEOUT_MS = 4500

type ErApiResponse = { rates?: { VND?: number } }
type ExchangeHostResponse = { rates?: { VND?: number } }

type CachedPayload = {
  v: 1
  savedAt: number
  rate: number
}

export type UsdVndFetchOk = {
  ok: true
  rate: number
  isStale: boolean
  cachedAt: number
}

export type UsdVndFetchErr = {
  ok: false
  rate: null
  isStale: false
  cachedAt: null
  error: string
}

export type UsdVndFetchResult = UsdVndFetchOk | UsdVndFetchErr

function saveCache(rate: number): void {
  try {
    const payload: CachedPayload = { v: 1, savedAt: Date.now(), rate }
    localStorage.setItem(USD_VND_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function loadUsdVndCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(USD_VND_CACHE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as CachedPayload
    if (p.v !== 1 || typeof p.rate !== 'number' || !Number.isFinite(p.rate) || p.rate <= 0)
      return null
    return p
  } catch {
    return null
  }
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController()
  const id = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    window.clearTimeout(id)
  }
}

async function tryPrimaryOnce(): Promise<number | null> {
  const j = await fetchJsonWithTimeout<ErApiResponse>(USD_VND_PRIMARY, TIMEOUT_MS)
  const v = j.rates?.VND
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
  return null
}

async function tryFallbackOnce(): Promise<number | null> {
  const j = await fetchJsonWithTimeout<ExchangeHostResponse>(USD_VND_FALLBACK, TIMEOUT_MS)
  const v = j.rates?.VND
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
  return null
}

/**
 * USD/VND (VND per 1 USD): backoff + cache + offline nhanh.
 */
export async function fetchUsdVnd(): Promise<UsdVndFetchResult> {
  if (isBrowserOffline()) {
    const cached = loadUsdVndCache()
    if (cached) {
      return {
        ok: true,
        rate: cached.rate,
        isStale: true,
        cachedAt: cached.savedAt,
      }
    }
    return {
      ok: false,
      rate: null,
      isStale: false,
      cachedAt: null,
      error: 'Ngoại tuyến và chưa có tỷ giá trong cache.',
    }
  }

  const primary = await fetchWithBackoff(
    () => tryPrimaryOnce(),
    (n): n is number => typeof n === 'number' && n > 0,
  )
  if (primary != null) {
    saveCache(primary)
    const now = Date.now()
    return { ok: true, rate: primary, isStale: false, cachedAt: now }
  }

  const secondary = await fetchWithBackoff(
    () => tryFallbackOnce(),
    (n): n is number => typeof n === 'number' && n > 0,
  )
  if (secondary != null) {
    saveCache(secondary)
    const now = Date.now()
    return { ok: true, rate: secondary, isStale: false, cachedAt: now }
  }

  const cached = loadUsdVndCache()
  if (cached) {
    return {
      ok: true,
      rate: cached.rate,
      isStale: true,
      cachedAt: cached.savedAt,
    }
  }

  return {
    ok: false,
    rate: null,
    isStale: false,
    cachedAt: null,
    error: 'Không tải được tỷ giá USD/VND và chưa có cache.',
  }
}
