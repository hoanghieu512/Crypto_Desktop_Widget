/** Phiên giao dịch theo khối giờ UTC (đơn giản hoá). */
export type TradingSession = 'ASIA' | 'EU' | 'US'

export const TRADING_SESSION_ORDER: readonly TradingSession[] = ['ASIA', 'EU', 'US']

/** Biên UTC [start, end) — trùng logic getSession. */
export const SESSION_UTC_END_HOUR: Record<TradingSession, { start: number; end: number }> = {
  ASIA: { start: 0, end: 8 },
  EU: { start: 8, end: 16 },
  US: { start: 16, end: 24 },
}

const VN_OFFSET_MIN = 7 * 60
const DAY_MIN = 24 * 60

function minutesToHHMM(totalMinutes: number): string {
  const n = ((totalMinutes % DAY_MIN) + DAY_MIN) % DAY_MIN
  const h = Math.floor(n / 60)
  const m = n % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Hiển thị tooltip: giờ Việt Nam (UTC+7), cùng cửa sổ với getSession. */
export function sessionRangeVn(s: TradingSession): string {
  const { start, end } = SESSION_UTC_END_HOUR[s]
  const startVn = start * 60 + VN_OFFSET_MIN
  const endVn = end * 60 + VN_OFFSET_MIN
  return `${minutesToHHMM(startVn)} – ${minutesToHHMM(endVn)} VN`
}

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
