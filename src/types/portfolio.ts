export type FuturesPositionSide = 'LONG' | 'SHORT'

export type FuturesPositionSource = 'manual' | 'synced'

export type FuturesPosition = {
  id: string
  /** e.g. "BTCUSDT" (case-insensitive, stored as upper in UI; realtime keys use lowercase) */
  symbol: string
  source: FuturesPositionSource
  side: FuturesPositionSide
  /** USDT entry price */
  entryPrice: number
  /** Margin in USDT (collateral user puts in) */
  margin: number
  /** Base asset quantity (e.g. 0.5 BTC) */
  quantity: number
  leverage: number
  createdAt: number
  /** Manual notes (manual positions only). Max 500 chars. */
  notes?: string
}

export type PortfolioState = {
  positions: FuturesPosition[]
}

