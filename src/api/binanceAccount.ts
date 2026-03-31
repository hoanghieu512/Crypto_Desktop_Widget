export type BinanceFuturesPositionRisk = {
  symbol: string
  positionAmt: string
  entryPrice: string
  markPrice: string
  unRealizedProfit: string
  leverage: string
  isolatedMargin: string
  positionSide?: 'BOTH' | 'LONG' | 'SHORT'
  marginType?: 'isolated' | 'cross'
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue
    usp.set(k, String(v))
  }
  return usp.toString()
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  const bytes = new Uint8Array(sig)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export type BinanceFetchError = {
  code: number | null
  message: string
  status: number | null
}

function parseErrMessage(status: number | null, code: number | null, msg: string): string {
  const m = msg || 'Unknown error'
  // Helpful hints for common Binance errors.
  if (code === -2015) return 'Invalid API-key, IP, or permissions for action.'
  if (code === -2014) return 'API-key format invalid.'
  if (code === -1022) return 'Signature for this request is not valid.'
  if (code === -1003) return 'Rate limit exceeded. Please wait and retry.'
  if (status === 401) return 'Unauthorized (check API key / secret).'
  if (status === 418 || status === 429) return 'Rate limited by Binance. Please wait and retry.'
  return m
}

export async function fetchFuturesPositions(params: {
  apiKey: string
  secretKey: string
  baseUrl?: string
  recvWindow?: number
}): Promise<BinanceFuturesPositionRisk[]> {
  const baseUrl = params.baseUrl ?? 'https://fapi.binance.com'
  const recvWindow = params.recvWindow ?? 5000
  const timestamp = Date.now()
  const qs = toQuery({ timestamp, recvWindow })
  const signature = await hmacSha256Hex(params.secretKey, qs)
  const url = `${baseUrl}/fapi/v2/positionRisk?${qs}&signature=${signature}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': params.apiKey,
    },
  })

  if (!res.ok) {
    let code: number | null = null
    let msg = ''
    try {
      const j = (await res.json()) as any
      code = typeof j?.code === 'number' ? j.code : null
      msg = typeof j?.msg === 'string' ? j.msg : ''
    } catch {
      try {
        msg = await res.text()
      } catch {
        /* ignore */
      }
    }
    const err: BinanceFetchError = {
      code,
      status: res.status,
      message: parseErrMessage(res.status, code, msg),
    }
    throw err
  }

  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  return data as BinanceFuturesPositionRisk[]
}

