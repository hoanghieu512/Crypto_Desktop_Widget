const USD_VND_PRIMARY = 'https://open.er-api.com/v6/latest/USD'
const USD_VND_FALLBACK = 'https://api.exchangerate.host/latest?base=USD&symbols=VND'

type ErApiResponse = { rates?: { VND?: number } }
type ExchangeHostResponse = { rates?: { VND?: number } }

export async function fetchUsdVnd(): Promise<number | null> {
  try {
    const r = await fetch(USD_VND_PRIMARY)
    if (r.ok) {
      const j = (await r.json()) as ErApiResponse
      const v = j.rates?.VND
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
    }
  } catch {
    /* fallback */
  }
  try {
    const r = await fetch(USD_VND_FALLBACK)
    if (!r.ok) return null
    const j = (await r.json()) as ExchangeHostResponse
    const v = j.rates?.VND
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
  } catch {
    return null
  }
  return null
}
