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
  metrics: FuturesSimulatorMetrics
}

function parseInputNumber(raw: string): number | null {
  const n = Number(String(raw).replace(/,/g, '').trim())
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

export function useFuturesSimulator(options: {
  currentPrice: number
  /** When this changes (e.g. first watchlist row), re-seed entry from market if possible */
  symbolKey: string
}): UseFuturesSimulatorResult {
  const { currentPrice, symbolKey } = options

  const [entryPrice, setEntryPrice] = useState('')
  const [leverage, setLeverage] = useState('10')
  const [positionSize, setPositionSize] = useState('100')
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  const [side, setSide] = useState<FuturesSide>('LONG')

  const entrySeededRef = useRef(false)

  useEffect(() => {
    entrySeededRef.current = false
  }, [symbolKey])

  useEffect(() => {
    if (entrySeededRef.current) return
    if (currentPrice <= 0 || !Number.isFinite(currentPrice)) return
    const id = window.setTimeout(() => {
      setEntryPrice(formatEntrySeed(currentPrice))
      entrySeededRef.current = true
    }, 0)
    return () => window.clearTimeout(id)
  }, [symbolKey, currentPrice])

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
    metrics,
  }
}
