export type FundingRateInfoRaw = {
  symbol?: string
  lastFundingRate?: string
  nextFundingTime?: number | string
}

export type FundingPaymentRaw = {
  fundingRate?: string
  fundingTime?: number | string
}

function toNum(x: unknown): number | null {
  const n = typeof x === 'number' ? x : Number(String(x ?? ''))
  return Number.isFinite(n) ? n : null
}

export async function fetchCurrentFundingRate(symbolUpper: string): Promise<{
  symbol: string
  fundingRate: number
  nextFundingTime: number
} | null> {
  const sym = String(symbolUpper ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!sym) return null
  const url = `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(sym)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const j = (await res.json()) as FundingRateInfoRaw
  const rate = toNum(j?.lastFundingRate)
  const next = toNum(j?.nextFundingTime)
  if (rate == null || next == null) return null
  return { symbol: sym, fundingRate: rate, nextFundingTime: next }
}

/**
 * Fetch funding rate history (public endpoint).
 * Note: Binance returns newest first. We normalize to ascending by fundingTime.
 */
export async function fetchFundingHistory(params: {
  symbolUpper: string
  startTime: number
  endTime: number
  limit?: number
}): Promise<{ fundingRate: number; fundingTime: number }[]> {
  const sym = String(params.symbolUpper ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!sym) return []
  const startTime = Math.max(0, Number(params.startTime) || 0)
  const endTime = Math.max(0, Number(params.endTime) || 0)
  const limit = Math.min(1000, Math.max(1, Number(params.limit ?? 100)))
  const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${encodeURIComponent(sym)}&startTime=${encodeURIComponent(
    startTime,
  )}&endTime=${encodeURIComponent(endTime)}&limit=${encodeURIComponent(limit)}`
  const res = await fetch(url)
  if (!res.ok) return []
  const j = (await res.json()) as unknown
  if (!Array.isArray(j)) return []
  const out = j
    .map((x) => x as FundingPaymentRaw)
    .map((x) => ({ fundingRate: toNum(x.fundingRate), fundingTime: toNum(x.fundingTime) }))
    .filter((x): x is { fundingRate: number; fundingTime: number } => x.fundingRate != null && x.fundingTime != null)
    .sort((a, b) => a.fundingTime - b.fundingTime)
  return out
}

