import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchCurrentFundingRate, fetchFundingHistory } from '../api/fundingRate'
import type { FundingPayment, FundingRateInfo, FundingResult } from '../types/funding'
import type { FuturesPosition } from '../types/portfolio'
import { calculateFundingPnL } from '../utils/fundingCalculator'

export type FundingDataResult = {
  fundingByPositionId: Record<string, FundingResult | undefined>
  currentBySymbol: Record<string, FundingRateInfo | undefined>
  updatedAt: number | null
}

const CURRENT_TTL_MS = 3 * 60_000
const HISTORY_TTL_MS = 12 * 60_000
const REFRESH_MS = 5 * 60_000

function normalizeSymbolUpper(sym: string): string {
  return String(sym ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

async function fetchHistoryPaged(params: { symbolUpper: string; startTime: number; endTime: number }): Promise<FundingPayment[]> {
  const out: FundingPayment[] = []
  let end = params.endTime
  const start = params.startTime
  // Binance returns newest first. Page backwards by endTime.
  for (let i = 0; i < 6; i++) {
    const page = await fetchFundingHistory({ symbolUpper: params.symbolUpper, startTime: start, endTime: end, limit: 100 })
    if (page.length === 0) break
    out.push(...page)
    const earliest = page[0]!.fundingTime
    if (earliest <= start) break
    end = Math.max(start, earliest - 1)
    if (page.length < 100) break
  }
  // `fetchFundingHistory` already sorts ascending; merge then uniq by time.
  const uniq = new Map<number, FundingPayment>()
  for (const p of out) uniq.set(p.fundingTime, p)
  return [...uniq.values()].sort((a, b) => a.fundingTime - b.fundingTime)
}

/**
 * Funding data for a set of futures positions (public endpoints, cached).
 * - current funding rate cached ~3m
 * - history cached ~12m
 */
export function useFundingData(params: {
  positions: FuturesPosition[]
  markPriceBySymbolUpper?: Record<string, number | null | undefined>
}): FundingDataResult {
  const [tick, setTick] = useState(0)
  const cacheRef = useRef<{
    current: Record<string, { v: FundingRateInfo | null; at: number }>
    history: Record<string, { v: FundingPayment[]; at: number; range: { start: number; end: number } }>
  }>({ current: {}, history: {} })

  const symbols = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const p of params.positions) {
      const s = normalizeSymbolUpper(p.symbol)
      if (!s || seen.has(s)) continue
      seen.add(s)
      out.push(s)
    }
    return out
  }, [params.positions])

  const oldestBySymbol = useMemo(() => {
    const out: Record<string, number> = {}
    for (const p of params.positions) {
      const s = normalizeSymbolUpper(p.symbol)
      if (!s) continue
      const t = Number(p.createdAt) || 0
      out[s] = out[s] != null ? Math.min(out[s]!, t) : t
    }
    return out
  }, [params.positions])

  useEffect(() => {
    if (symbols.length === 0) return
    let cancelled = false
    const run = async () => {
      const now = Date.now()
      const tasks: Promise<void>[] = []

      for (const sym of symbols) {
        const cur = cacheRef.current.current[sym]
        if (!cur || now - cur.at > CURRENT_TTL_MS) {
          tasks.push(
            (async () => {
              const v = await fetchCurrentFundingRate(sym)
              cacheRef.current.current[sym] = { v, at: Date.now() }
            })(),
          )
        }

        const start = Math.max(0, oldestBySymbol[sym] ?? 0)
        const end = now
        const hist = cacheRef.current.history[sym]
        const stale = !hist || now - hist.at > HISTORY_TTL_MS
        const rangeMismatch = !hist || hist.range.start !== start || hist.range.end < end - 15 * 60_000
        if (stale || rangeMismatch) {
          tasks.push(
            (async () => {
              const v = await fetchHistoryPaged({ symbolUpper: sym, startTime: start, endTime: end })
              cacheRef.current.history[sym] = { v, at: Date.now(), range: { start, end } }
            })(),
          )
        }
      }

      if (tasks.length === 0) return
      try {
        await Promise.all(tasks)
      } finally {
        if (!cancelled) setTick((x) => x + 1)
      }
    }

    void run()
    const id = window.setInterval(run, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [symbols, oldestBySymbol])

  void tick
  const currentBySymbol = useMemo(() => {
    const out: Record<string, FundingRateInfo | undefined> = {}
    for (const sym of symbols) {
      const v = cacheRef.current.current[sym]?.v ?? null
      if (v) out[sym] = v
    }
    return out
  }, [symbols, tick])

  const fundingByPositionId = useMemo(() => {
    const out: Record<string, FundingResult | undefined> = {}
    for (const p of params.positions) {
      const sym = normalizeSymbolUpper(p.symbol)
      const hist = cacheRef.current.history[sym]?.v ?? []
      const cur = cacheRef.current.current[sym]?.v ?? null
      const mark = params.markPriceBySymbolUpper?.[sym]
      out[p.id] = calculateFundingPnL({
        position: p,
        fundingHistory: hist,
        currentMarkPrice: mark != null ? Number(mark) : null,
        currentRateInfo: cur,
      })
    }
    return out
  }, [params.positions, params.markPriceBySymbolUpper, tick])

  const updatedAt = useMemo(() => {
    let max = 0
    for (const sym of symbols) {
      const a = cacheRef.current.current[sym]?.at ?? 0
      const b = cacheRef.current.history[sym]?.at ?? 0
      max = Math.max(max, a, b)
    }
    return max > 0 ? max : null
  }, [symbols, tick])

  return { fundingByPositionId, currentBySymbol, updatedAt }
}

