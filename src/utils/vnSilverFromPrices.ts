import type { GoldPricesMap } from '../api/fetchGoldWithFallback'

export type VnSilverQuote = {
  code: string
  name: string
  buy: number
  sell: number
  midVndPerLuong: number
  currency: string
}

/** Mã có thể xuất hiện khi API bổ sung niêm yết bạc */
const SILVER_CODE_CANDIDATES = [
  'BAC9999',
  'BAC999',
  'BTBAC',
  'PQBAC',
  'XAGVND',
  'SILVERVN',
] as const

const NAME_HINT = /bạc|silver/i

/**
 * Tìm dòng bạc trong bảng vang.today / giavang (VND/lượng hoặc VND/chỉ — giữ nguyên số API).
 */
export function pickVnSilverFromPrices(
  prices: GoldPricesMap | undefined,
): VnSilverQuote | null {
  if (!prices) return null

  for (const code of SILVER_CODE_CANDIDATES) {
    const p = prices[code]
    if (
      p &&
      typeof p.buy === 'number' &&
      typeof p.sell === 'number' &&
      p.buy > 0 &&
      p.sell > 0
    ) {
      return {
        code,
        name: p.name,
        buy: p.buy,
        sell: p.sell,
        midVndPerLuong: (p.buy + p.sell) / 2,
        currency: p.currency,
      }
    }
  }

  for (const [code, p] of Object.entries(prices)) {
    if (!p?.name || !NAME_HINT.test(p.name)) continue
    if (
      typeof p.buy === 'number' &&
      typeof p.sell === 'number' &&
      p.buy > 0 &&
      p.sell > 0
    ) {
      return {
        code,
        name: p.name,
        buy: p.buy,
        sell: p.sell,
        midVndPerLuong: (p.buy + p.sell) / 2,
        currency: p.currency,
      }
    }
  }

  return null
}
