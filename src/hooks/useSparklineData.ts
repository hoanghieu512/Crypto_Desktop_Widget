import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchWithRetry } from '../utils/fetchWithRetry'

export type SparklineMarket = 'spot' | 'futures'

export type SparklineRequest = {
  symbolUpper: string
  market: SparklineMarket
}

export type SparklineMap = Record<string, number[] | null | undefined>

const TTL_MS = 12 * 60_000 // refresh ~12 min
const INTERVAL = '1h'
const LIMIT = 24

function keyOf(r: SparklineRequest): string {
  return `${r.market}:${r.symbolUpper}`
}

function normalizeSymbolUpper(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

async function fetchSparkline(symbolUpper: string, market: SparklineMarket): Promise<number[] | null> {
  const sym = normalizeSymbolUpper(symbolUpper)
  if (!sym) return null
  const base =
    market === 'futures'
      ? 'https://fapi.binance.com/fapi/v1/klines'
      : 'https://api.binance.com/api/v3/klines'

  const url = `${base}?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(INTERVAL)}&limit=${LIMIT}`
  const res = await fetchWithRetry(url, undefined, { maxRetries: 3, baseDelayMs: 800 })
  if (!res.ok) return null
  const j = (await res.json()) as unknown
  if (!Array.isArray(j)) return null
  const closes = j
    .map((k: any) => (Array.isArray(k) ? Number.parseFloat(String(k[4] ?? '')) : Number.NaN))
    .filter((n) => Number.isFinite(n))
  return closes.length >= 2 ? closes : null
}

type CacheEntry = { data: number[] | null; fetchedAt: number; failed?: boolean }

export type UseSparklineDataResult = {
  sparklines: SparklineMap
  /** True while any requested key has no cache entry yet or an in-flight fetch */
  isLoading: boolean
  /** Keys where the last fetch failed after retries */
  errorsByKey: Record<string, boolean>
  /** Clear failed entries and refetch */
  retry: () => void
}

/**
 * Fetch + cache (in-memory) 24h sparkline close prices per (market,symbol).
 * Missing keys are omitted from the map until the first fetch settles (then `null` if error/short data).
 */
export function useSparklineData(requests: SparklineRequest[]): UseSparklineDataResult {
  const [bump, setBump] = useState(0)
  const [retryGen, setRetryGen] = useState(0)
  const cacheRef = useRef<Record<string, CacheEntry>>({})
  const inflightRef = useRef<Record<string, Promise<void> | null>>({})

  const retry = useCallback(() => {
    for (const k of Object.keys(cacheRef.current)) {
      if (cacheRef.current[k]?.failed) delete cacheRef.current[k]
    }
    setRetryGen((g) => g + 1)
  }, [])

  const keys = useMemo(() => {
    const uniq = new Set<string>()
    const out: SparklineRequest[] = []
    for (const r of requests) {
      const sym = normalizeSymbolUpper(r.symbolUpper)
      const market: SparklineMarket = r.market === 'futures' ? 'futures' : 'spot'
      if (!sym) continue
      const k = `${market}:${sym}`
      if (uniq.has(k)) continue
      uniq.add(k)
      out.push({ market, symbolUpper: sym })
    }
    return out
  }, [requests])

  useEffect(() => {
    let cancelled = false
    const now = Date.now()
    const need = keys.filter((r) => {
      const k = keyOf(r)
      const c = cacheRef.current[k]
      return !c || now - c.fetchedAt > TTL_MS
    })
    if (need.length === 0) return

    for (const r of need) {
      const k = keyOf(r)
      if (inflightRef.current[k]) continue
      inflightRef.current[k] = (async () => {
        try {
          const data = await fetchSparkline(r.symbolUpper, r.market)
          cacheRef.current[k] = { data, fetchedAt: Date.now(), failed: false }
        } catch {
          cacheRef.current[k] = { data: null, fetchedAt: Date.now(), failed: true }
        } finally {
          inflightRef.current[k] = null
          if (!cancelled) setBump((x) => x + 1)
        }
      })()
    }

    return () => {
      cancelled = true
    }
  }, [keys, retryGen])

  void bump
  const out: SparklineMap = {}
  const errorsByKey: Record<string, boolean> = {}
  let anyMissing = false
  for (const r of keys) {
    const k = keyOf(r)
    const cached = cacheRef.current[k]
    if (cached) {
      out[k] = cached.data
      if (cached.failed) errorsByKey[k] = true
    } else anyMissing = true
  }

  const isLoading = keys.length > 0 && anyMissing

  return { sparklines: out, isLoading, errorsByKey, retry }
}

