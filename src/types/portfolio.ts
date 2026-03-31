export type FuturesPositionSide = 'LONG' | 'SHORT'

export type FuturesPosition = {
  id: string
  /** e.g. "BTCUSDT" (case-insensitive, stored as upper in UI; realtime keys use lowercase) */
  symbol: string
  side: FuturesPositionSide
  /** USDT entry price */
  entryPrice: number
  /** Base asset quantity (e.g. 0.5 BTC) */
  quantity: number
  leverage: number
  createdAt: number
}

export type PortfolioState = {
  positions: FuturesPosition[]
}

