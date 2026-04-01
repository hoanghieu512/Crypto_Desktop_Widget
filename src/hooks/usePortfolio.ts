import { useCallback, useEffect, useMemo, useState } from 'react'
import { showErrorToast } from '../utils/appToast'
import { ViErrors } from '../utils/friendlyErrors'
import { arrayMove } from '@dnd-kit/sortable'
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
        const marginMode: FuturesPosition['marginMode'] =
          (p as any).marginMode === 'isolated' ? 'isolated' : 'cross'
        const initialMarginRaw = Number((p as any).initialMargin)
        const initialMargin =
          Number.isFinite(initialMarginRaw) && initialMarginRaw > 0 ? initialMarginRaw : undefined
        const entryPrice = Number(p.entryPrice)
        const quantity = Number(p.quantity)
        const lev = Number(p.leverage)
        const source = 'manual' as const
        const legacyNotional = Number((p as any).notional)
        const marginRaw = Number((p as any).margin)
        const margin =
          Number.isFinite(marginRaw) && marginRaw > 0
            ? marginRaw
            : Number.isFinite(legacyNotional) && legacyNotional > 0
              ? legacyNotional
              : Number.isFinite(entryPrice) && entryPrice > 0 && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(lev) && lev > 0
                ? (entryPrice * quantity) / lev
                : Number.NaN
        return {
          id: String(p.id),
          symbol: String(p.symbol),
          source,
          side,
          marginMode,
          initialMargin,
          entryPrice,
          margin,
          quantity,
          leverage: lev,
          createdAt: Number(p.createdAt ?? Date.now()),
          notes: typeof (p as any).notes === 'string' ? String((p as any).notes) : undefined,
        }
      })
      .filter(
        (p) =>
          Number.isFinite(p.entryPrice) &&
          p.entryPrice > 0 &&
          Number.isFinite(p.margin) &&
          p.margin > 0 &&
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
  manualPositions: FuturesPosition[]
  syncedPositions: FuturesPosition[]
  computed: PositionComputed[]
  totals: PortfolioTotals
  /** Futures mark WebSocket: waiting for first tick */
  loading: boolean
  /** First paint after reading manual positions from localStorage */
  storageHydrated: boolean
  addPosition: (p: {
    symbol: string
    side: FuturesPositionSide
    entryPrice: number
    leverage: number
    /** Optional (can be derived from notional/entry). */
    quantity?: number
    /** Optional (collateral USDT). */
    margin?: number
    /** Optional (notional USDT). */
    notional?: number
    /** Optional margin mode. Defaults cross. */
    marginMode?: 'cross' | 'isolated'
    /** Optional original margin. */
    initialMargin?: number
  }) => void
  setSyncedPositions: (items: FuturesPosition[]) => void
  updatePositionNote: (id: string, notes: string) => void
  removePosition: (id: string) => void
  updatePosition: (id: string, patch: Partial<Omit<FuturesPosition, 'id' | 'createdAt'>>) => void
  /** Reorder manual positions by id (drag & drop). */
  reorderManualPositions: (activeId: string, overId: string) => void
  clearAll: () => void
}

function newId(): string {
  return crypto.randomUUID()
}

export function usePortfolio(enabled: boolean): UsePortfolioResult {
  const [manual, setManual] = useState<FuturesPosition[]>([])
  const [storageHydrated, setStorageHydrated] = useState(false)
  const [synced, setSynced] = useState<FuturesPosition[]>([])

  useEffect(() => {
    try {
      const parsed = safeParseState(localStorage.getItem(STORAGE_KEY)).positions.map((p) => ({
        ...p,
        source: 'manual' as const,
      }))
      setManual(parsed)
    } catch {
      setManual([])
    } finally {
      setStorageHydrated(true)
    }
  }, [])

  const manualPositions = manual
  const syncedPositions = synced
  const positions = useMemo(
    () => uniqById([...(syncedPositions ?? []), ...(manualPositions ?? [])]),
    [syncedPositions, manualPositions],
  )

  const setSyncedPositions = useCallback((items: FuturesPosition[]) => {
    const cleaned = items
      .filter(Boolean)
      .map((p) => ({ ...p, source: 'synced' as const }))
    setSynced(uniqById(cleaned))
  }, [])

  const reorderManualPositions = useCallback((activeId: string, overId: string) => {
    if (!activeId || !overId || activeId === overId) return
    setManual((cur) => {
      const oldIndex = cur.findIndex((p) => p.id === activeId)
      const newIndex = cur.findIndex((p) => p.id === overId)
      if (oldIndex < 0 || newIndex < 0) return cur
      return arrayMove(cur, oldIndex, newIndex)
    })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ positions: manualPositions } satisfies PortfolioState),
      )
      window.dispatchEvent(new CustomEvent('portfolio:change'))
    } catch {
      showErrorToast(ViErrors.storageTitle, ViErrors.storageMessage)
    }
  }, [manualPositions])

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

      const margin = pos.margin
      const posNotional =
        Number.isFinite(margin) && margin > 0 && pos.leverage > 0 ? margin * pos.leverage : Number.NaN

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
        notional: Number.isFinite(posNotional) ? posNotional : 0,
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

  const addPosition = useCallback(
    (p: {
      symbol: string
      side: FuturesPositionSide
      entryPrice: number
      leverage: number
      quantity?: number
      margin?: number
      notional?: number
      marginMode?: 'cross' | 'isolated'
      initialMargin?: number
    }) => {
      const symbol = p.symbol.trim().toUpperCase()
      const entryPrice = Number(p.entryPrice)
      const leverage = Number(p.leverage)
      const qRaw = p.quantity != null ? Number(p.quantity) : Number.NaN
      const mRaw = p.margin != null ? Number(p.margin) : Number.NaN
      const nRaw = p.notional != null ? Number(p.notional) : Number.NaN

      const quantity =
        Number.isFinite(qRaw) && qRaw > 0
          ? qRaw
          : Number.isFinite(nRaw) && nRaw > 0 && Number.isFinite(entryPrice) && entryPrice > 0
            ? nRaw / entryPrice
            : Number.isFinite(mRaw) && mRaw > 0 && Number.isFinite(leverage) && leverage > 0 && Number.isFinite(entryPrice) && entryPrice > 0
              ? (mRaw * leverage) / entryPrice
            : Number.NaN

      const notional =
        Number.isFinite(nRaw) && nRaw > 0
          ? nRaw
          : Number.isFinite(quantity) && quantity > 0 && Number.isFinite(entryPrice) && entryPrice > 0
            ? entryPrice * quantity
            : Number.NaN

      const margin =
        Number.isFinite(mRaw) && mRaw > 0
          ? mRaw
          : Number.isFinite(notional) && notional > 0 && Number.isFinite(leverage) && leverage > 0
            ? notional / leverage
            : Number.NaN

      if (
        !symbol ||
        !Number.isFinite(entryPrice) ||
        entryPrice <= 0 ||
        !Number.isFinite(leverage) ||
        leverage <= 0 ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(margin) ||
        margin <= 0
      ) {
        return
      }

      const next: FuturesPosition = {
        id: newId(),
        createdAt: Date.now(),
        symbol,
        source: 'manual',
        side: p.side === 'SHORT' ? 'SHORT' : 'LONG',
        marginMode: p.marginMode === 'isolated' ? 'isolated' : 'cross',
        initialMargin:
          p.initialMargin != null && Number.isFinite(Number(p.initialMargin)) && Number(p.initialMargin) > 0
            ? Number(p.initialMargin)
            : undefined,
        entryPrice,
        margin,
        quantity,
        leverage,
      }
      setManual((cur) => uniqById([next, ...cur]))
    },
    [],
  )

  const removePosition = useCallback((id: string) => {
    setManual((cur) => cur.filter((p) => p.id !== id))
  }, [])

  const updatePosition = useCallback(
    (id: string, patch: Partial<Omit<FuturesPosition, 'id' | 'createdAt'>>) => {
      setManual((cur) =>
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
    setManual([])
  }, [])

  const updatePositionNote = useCallback((id: string, notes: string) => {
    const next = String(notes ?? '').slice(0, 500)
    setManual((cur) =>
      cur.map((p) => {
        if (p.id !== id) return p
        if (p.source === 'synced') return p
        const trimmed = next.trim()
        return { ...p, notes: trimmed.length === 0 ? undefined : trimmed }
      }),
    )
  }, [])

  return {
    positions,
    manualPositions,
    syncedPositions,
    computed,
    totals,
    loading: rt.loading,
    storageHydrated,
    addPosition,
    setSyncedPositions,
    updatePositionNote,
    removePosition,
    updatePosition,
    reorderManualPositions,
    clearAll,
  }
}

