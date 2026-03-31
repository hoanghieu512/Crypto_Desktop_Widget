import { useCallback, useEffect, useMemo, useState } from 'react'
import { priceMapKey, useRealtimePrice, type WatchPriceEntry } from './useRealtimePrice'
import type { FuturesPosition, FuturesPositionSide, PortfolioState } from '../types/portfolio'

const STORAGE_KEY = 'futures-portfolio-v1'

function safeParseState(raw: string | null): PortfolioState {
  if (!raw) return { positions: [] }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return { positions: [] }
    const pos = (parsed as PortfolioState).positions
    if (!Array.isArray(pos)) return { positions: [] }
    const cleaned: FuturesPosition[] = pos
      .filter(Boolean)
      .map((p) => p as Partial<FuturesPosition>)
      .filter((p) => typeof p.id === 'string' && typeof p.symbol === 'string')
      .map((p) => {
        const side: FuturesPositionSide = p.side === 'SHORT' ? 'SHORT' : 'LONG'
        return {
        id: String(p.id),
        symbol: String(p.symbol),
          side,
        entryPrice: Number(p.entryPrice),
        quantity: Number(p.quantity),
        leverage: Number(p.leverage),
        createdAt: Number(p.createdAt ?? Date.now()),
        }
      })
      .filter(
        (p) =>
          Number.isFinite(p.entryPrice) &&
          p.entryPrice > 0 &&
          Number.isFinite(p.quantity) &&
          p.quantity > 0 &&
          Number.isFinite(p.leverage) &&
          p.leverage > 0 &&
          Number.isFinite(p.createdAt),
      )
    return { positions: cleaned }
  } catch {
    return { positions: [] }
  }
}

function uniqById(items: FuturesPosition[]): FuturesPosition[] {
  const seen = new Set<string>()
  const out: FuturesPosition[] = []
  for (const p of items) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}

export type PositionComputed = {
  position: FuturesPosition
  /** futures mark price (USDT) */
  markPrice: number | null
  /** true when mark is missing and we fallback to entry */
  markMissing: boolean
  notional: number
  margin: number
  unrealizedPnl: number | null
  roe: number | null
}

export type PortfolioTotals = {
  totalMargin: number
  totalUnrealizedPnl: number
  totalRoe: number | null
}

export type UsePortfolioResult = {
  positions: FuturesPosition[]
  computed: PositionComputed[]
  totals: PortfolioTotals
  loading: boolean
  addPosition: (p: Omit<FuturesPosition, 'id' | 'createdAt'>) => void
  removePosition: (id: string) => void
  updatePosition: (id: string, patch: Partial<Omit<FuturesPosition, 'id' | 'createdAt'>>) => void
  clearAll: () => void
}

function newId(): string {
  return crypto.randomUUID()
}

export function usePortfolio(enabled: boolean): UsePortfolioResult {
  const [positions, setPositions] = useState<FuturesPosition[]>(() => {
    try {
      return safeParseState(localStorage.getItem(STORAGE_KEY)).positions
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ positions } satisfies PortfolioState))
      window.dispatchEvent(new CustomEvent('portfolio:change'))
    } catch {
      /* ignore */
    }
  }, [positions])

  const entries = useMemo((): WatchPriceEntry[] => {
    if (!enabled) return []
    const uniq = new Set<string>()
    const out: WatchPriceEntry[] = []
    for (const p of positions) {
      const sym = p.symbol.trim().toLowerCase()
      if (!sym) continue
      if (uniq.has(sym)) continue
      uniq.add(sym)
      out.push({ key: `pf|${sym}`, symbol: sym, market: 'futures' })
    }
    return out
  }, [positions, enabled])

  const rt = useRealtimePrice(entries)

  const computed = useMemo((): PositionComputed[] => {
    return positions.map((pos) => {
      const symLower = pos.symbol.trim().toLowerCase()
      const key = priceMapKey(symLower, 'futures')
      const e = rt.prices[key]
      const mark =
        e?.market === 'futures' ? Number.parseFloat(e.snapshot.markPrice) : Number.NaN
      const markPrice = Number.isFinite(mark) && mark > 0 ? mark : null

      const notional = pos.entryPrice * pos.quantity
      const margin = pos.leverage > 0 ? notional / pos.leverage : Number.NaN

      const markMissing = markPrice == null
      const effectiveMark = markPrice ?? pos.entryPrice

      const dir = pos.side === 'LONG' ? 1 : -1
      const unrealizedPnl =
        Number.isFinite(effectiveMark) && Number.isFinite(pos.entryPrice) && pos.quantity > 0
          ? (effectiveMark - pos.entryPrice) * pos.quantity * dir
          : null

      const roe =
        unrealizedPnl != null && Number.isFinite(margin) && margin > 0
          ? (unrealizedPnl / margin) * 100
          : null

      return {
        position: pos,
        markPrice,
        markMissing,
        notional: Number.isFinite(notional) ? notional : 0,
        margin: Number.isFinite(margin) ? margin : 0,
        unrealizedPnl,
        roe,
      }
    })
  }, [positions, rt.prices])

  const totals = useMemo((): PortfolioTotals => {
    const totalMargin = computed.reduce((a, c) => a + (Number.isFinite(c.margin) ? c.margin : 0), 0)
    const totalUnrealizedPnl = computed.reduce(
      (a, c) => a + (c.unrealizedPnl != null && Number.isFinite(c.unrealizedPnl) ? c.unrealizedPnl : 0),
      0,
    )
    const totalRoe = totalMargin > 0 ? (totalUnrealizedPnl / totalMargin) * 100 : null
    return { totalMargin, totalUnrealizedPnl, totalRoe }
  }, [computed])

  const addPosition = useCallback((p: Omit<FuturesPosition, 'id' | 'createdAt'>) => {
    const next: FuturesPosition = {
      ...p,
      id: newId(),
      symbol: p.symbol.trim().toUpperCase(),
      createdAt: Date.now(),
    }
    setPositions((cur) => uniqById([next, ...cur]))
  }, [])

  const removePosition = useCallback((id: string) => {
    setPositions((cur) => cur.filter((p) => p.id !== id))
  }, [])

  const updatePosition = useCallback(
    (id: string, patch: Partial<Omit<FuturesPosition, 'id' | 'createdAt'>>) => {
      setPositions((cur) =>
        cur.map((p) => {
          if (p.id !== id) return p
          const sym = patch.symbol != null ? String(patch.symbol).trim().toUpperCase() : p.symbol
          return {
            ...p,
            ...patch,
            symbol: sym,
          }
        }),
      )
    },
    [],
  )

  const clearAll = useCallback(() => {
    setPositions([])
  }, [])

  return {
    positions,
    computed,
    totals,
    loading: rt.loading,
    addPosition,
    removePosition,
    updatePosition,
    clearAll,
  }
}

