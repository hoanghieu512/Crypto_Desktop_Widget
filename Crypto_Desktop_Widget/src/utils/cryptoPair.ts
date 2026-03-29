const QUOTE_SUFFIXES = [
  'usdt',
  'usdc',
  'busd',
  'fdusd',
  'btc',
  'eth',
  'bnb',
  'try',
  'eur',
  'brl',
] as const

/**
 * Chuẩn hoá nhập cặp Binance spot: `btc` → `btcusdt`, giữ nguyên nếu đã có hậu tố quote.
 */
export function normalizeCryptoPairInput(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!s) return ''

  for (const q of QUOTE_SUFFIXES) {
    if (s.endsWith(q) && s.length > q.length) {
      return s
    }
  }

  if (/^[a-z0-9]{2,20}$/.test(s)) {
    return `${s}usdt`
  }

  return s
}
