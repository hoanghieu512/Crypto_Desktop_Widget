/** Phiên giao dịch theo khối giờ UTC (đơn giản hoá). */
export type TradingSession = 'ASIA' | 'EU' | 'US'

export const TRADING_SESSION_ORDER: readonly TradingSession[] = ['ASIA', 'EU', 'US']

/**
 * Asia: 00:00–08:00 UTC
 * EU:   08:00–16:00 UTC
 * US:   16:00–24:00 UTC
 */
export function getSession(now: Date = new Date()): TradingSession {
  const h = now.getUTCHours()
  if (h < 8) return 'ASIA'
  if (h < 16) return 'EU'
  return 'US'
}
