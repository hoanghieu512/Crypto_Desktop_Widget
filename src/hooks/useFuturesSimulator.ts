import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'

export type FuturesSide = 'LONG' | 'SHORT'

export type FuturesSimulatorMetrics = {
  pnl: number | null
  pnlPercent: number | null
  tpPnl: number | null
  slPnl: number | null
  riskReward: number | null
  liquidationPrice: number | null
}

export type UseFuturesSimulatorResult = {
  entryPrice: string
  setEntryPrice: Dispatch<SetStateAction<string>>
  leverage: string
  setLeverage: Dispatch<SetStateAction<string>>
  positionSize: string
  setPositionSize: Dispatch<SetStateAction<string>>
  tp: string
  setTp: Dispatch<SetStateAction<string>>
  sl: string
  setSl: Dispatch<SetStateAction<string>>
  side: FuturesSide
  setSide: Dispatch<SetStateAction<FuturesSide>>
  marginMode: 'cross' | 'isolated'
  setMarginMode: Dispatch<SetStateAction<'cross' | 'isolated'>>
  metrics: FuturesSimulatorMetrics
  reset: () => void
}

function parseInputNumber(raw: string): number | null {
  const s0 = String(raw).trim().replace(/\s+/g, '')
  // Support locales:
  // - "808,8"  -> 808.8  (comma decimal)
  // - "1,234.5" -> 1234.5 (comma thousands)
  // - "1.234,5" -> 1234.5 (dot thousands + comma decimal)
  const s =
    s0.includes(',') && s0.includes('.')
      ? s0.replace(/,/g, '')
      : s0.includes(',') && !s0.includes('.')
        ? s0.replace(/,/g, '.')
        : s0
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** USDT PnL from price move vs entry; margin = positionSize, notional scale = × leverage */
export function calcFuturesPnlUsdt(
  side: FuturesSide,
  markPrice: number,
  entryPrice: number,
  positionSizeUsdt: number,
  leverage: number,
): number | null {
  if (entryPrice <= 0 || !Number.isFinite(markPrice) || positionSizeUsdt <= 0 || leverage <= 0) {
    return null
  }
  const r = side === 'LONG' ? (markPrice - entryPrice) / entryPrice : (entryPrice - markPrice) / entryPrice
  return r * positionSizeUsdt * leverage
}

/** Isolated-style approximation: ~100% loss of margin at 1/L adverse move */
export function calcLiquidationApprox(side: FuturesSide, entry: number, leverage: number): number | null {
  if (entry <= 0 || leverage <= 0) return null
  return side === 'LONG' ? entry * (1 - 1 / leverage) : entry * (1 + 1 / leverage)
}

function formatEntrySeed(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return ''
  const maxFrac = price >= 1000 ? 2 : price >= 1 ? 4 : 6
  return price.toFixed(maxFrac).replace(/\.?0+$/, '')
}

type SavedSimState = {
  entryPrice: string
  leverage: string
  positionSize: string
  tp: string
  sl: string
  side: FuturesSide
  marginMode?: 'cross' | 'isolated'
}

const STORAGE_KEY = 'futures-simulator-state-v1'

function normalizeSymbolKey(raw: string): string {
  return raw.trim().toUpperCase()
}

function loadAll(): Record<string, SavedSimState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, SavedSimState>
  } catch {
    return {}
  }
}

function saveAll(next: Record<string, SavedSimState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function loadSavedState(symbol: string): SavedSimState | null {
  const k = normalizeSymbolKey(symbol)
  if (!k) return null
  const all = loadAll()
  const s = all[k]
  if (!s) return null
  if (typeof s !== 'object') return null
  return {
    entryPrice: typeof s.entryPrice === 'string' ? s.entryPrice : '',
    leverage: typeof s.leverage === 'string' ? s.leverage : '10',
    positionSize: typeof s.positionSize === 'string' ? s.positionSize : '100',
    tp: typeof s.tp === 'string' ? s.tp : '',
    sl: typeof s.sl === 'string' ? s.sl : '',
    side: s.side === 'SHORT' ? 'SHORT' : 'LONG',
    marginMode: (s as any).marginMode === 'isolated' ? 'isolated' : 'cross',
  }
}

export function saveState(symbol: string, state: SavedSimState) {
  const k = normalizeSymbolKey(symbol)
  if (!k) return
  const all = loadAll()
  all[k] = state
  saveAll(all)
}

export function clearSavedState(symbol: string) {
  const k = normalizeSymbolKey(symbol)
  if (!k) return
  const all = loadAll()
  if (!(k in all)) return
  delete all[k]
  saveAll(all)
}

export function useFuturesSimulator(options: {
  currentPrice: number
  /** When this changes (e.g. first watchlist row), re-seed entry from market if possible */
  symbolKey: string
  /** Used for persisting simulator inputs per symbol */
  symbol: string
}): UseFuturesSimulatorResult {
  const { currentPrice, symbolKey, symbol } = options

  const [entryPrice, setEntryPrice] = useState('')
  const [leverage, setLeverage] = useState('10')
  const [positionSize, setPositionSize] = useState('100')
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  const [side, setSide] = useState<FuturesSide>('LONG')
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('cross')

  const entrySeededRef = useRef(false)
  const savedLoadedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    entrySeededRef.current = false
    savedLoadedRef.current = false
  }, [symbolKey])

  // Load persisted state per symbol (if exists). This runs on open/reopen and on symbol switch.
  useEffect(() => {
    const k = normalizeSymbolKey(symbol)
    if (!k) return
    const saved = loadSavedState(k)
    if (!saved) return
    setEntryPrice(saved.entryPrice)
    setLeverage(saved.leverage)
    setPositionSize(saved.positionSize)
    setTp(saved.tp)
    setSl(saved.sl)
    setSide(saved.side)
    setMarginMode(saved.marginMode === 'isolated' ? 'isolated' : 'cross')
    savedLoadedRef.current = true
    entrySeededRef.current = true
  }, [symbol, symbolKey])

  useEffect(() => {
    if (entrySeededRef.current) return
    if (currentPrice <= 0 || !Number.isFinite(currentPrice)) return
    const id = window.setTimeout(() => {
      setEntryPrice(formatEntrySeed(currentPrice))
      entrySeededRef.current = true
    }, 0)
    return () => window.clearTimeout(id)
  }, [symbolKey, currentPrice])

  // Persist inputs (debounced).
  useEffect(() => {
    const k = normalizeSymbolKey(symbol)
    if (!k) return
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      saveState(k, { entryPrice, leverage, positionSize, tp, sl, side, marginMode })
    }, 500)
    return () => {
      if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current)
    }
  }, [symbol, entryPrice, leverage, positionSize, tp, sl, side, marginMode])

  const reset = () => {
    setEntryPrice('')
    setLeverage('10')
    setPositionSize('100')
    setTp('')
    setSl('')
    setSide('LONG')
    setMarginMode('cross')
    clearSavedState(symbol)
    entrySeededRef.current = false
    savedLoadedRef.current = false
  }

  const metrics = useMemo((): FuturesSimulatorMetrics => {
    const entry = parseInputNumber(entryPrice)
    const lev = parseInputNumber(leverage)
    const size = parseInputNumber(positionSize)
    const tpPx = parseInputNumber(tp)
    const slPx = parseInputNumber(sl)

    if (entry == null || lev == null || size == null) {
      return {
        pnl: null,
        pnlPercent: null,
        tpPnl: null,
        slPnl: null,
        riskReward: null,
        liquidationPrice: null,
      }
    }

    const pnl =
      Number.isFinite(currentPrice) && currentPrice > 0
        ? calcFuturesPnlUsdt(side, currentPrice, entry, size, lev)
        : null
    const pnlPercent =
      pnl != null && size > 0 ? (pnl / size) * 100 : null

    const tpPnl =
      tpPx != null ? calcFuturesPnlUsdt(side, tpPx, entry, size, lev) : null
    const slPnl =
      slPx != null ? calcFuturesPnlUsdt(side, slPx, entry, size, lev) : null

    let riskReward: number | null = null
    if (tpPnl != null && slPnl != null && slPnl !== 0) {
      riskReward = Math.abs(tpPnl) / Math.abs(slPnl)
    }

    const liquidationPrice = calcLiquidationApprox(side, entry, lev)

    return {
      pnl,
      pnlPercent,
      tpPnl,
      slPnl,
      riskReward,
      liquidationPrice,
    }
  }, [currentPrice, entryPrice, leverage, positionSize, tp, sl, side])

  return {
    entryPrice,
    setEntryPrice,
    leverage,
    setLeverage,
    positionSize,
    setPositionSize,
    tp,
    setTp,
    sl,
    setSl,
    side,
    setSide,
    marginMode,
    setMarginMode,
    metrics,
    reset,
  }
}
