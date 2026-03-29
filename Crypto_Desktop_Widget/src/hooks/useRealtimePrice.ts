/* eslint-disable react-hooks/set-state-in-effect -- WebSocket: reset state khi đổi stream / teardown */
import { useEffect, useMemo, useRef, useState } from 'react'

const SPOT_COMBINED_WS = 'wss://stream.binance.com:9443/stream'
const FUTURES_COMBINED_WS = 'wss://fstream.binance.com/stream'

export type Market = 'spot' | 'futures'

export type TickerSnapshot = {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  eventTime: number
}

/** USD-M Futures @markPrice stream */
export type FuturesMarkSnapshot = {
  symbol: string
  /** Mark price (dùng làm giá chính) */
  markPrice: string
  indexPrice?: string
  fundingRate: string
  nextFundingTime: number
  eventTime: number
}

export type PriceMapEntry =
  | { market: 'spot'; snapshot: TickerSnapshot }
  | { market: 'futures'; snapshot: FuturesMarkSnapshot }

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed'

export type WatchPriceEntry = {
  /** Khóa ổn định theo dòng watchlist */
  key: string
  symbol: string
  market: Market
}

export type UseRealtimePriceOptions = {
  reconnectBaseMs?: number
  reconnectMaxMs?: number
}

export type MarketSocketSlice = {
  status: ConnectionStatus
  streams: readonly string[]
  lastError: string | null
}

export type UseRealtimePriceResult = {
  /** Khóa: `${symbol}|spot` hoặc `${symbol}|futures` (symbol đã lowercase) */
  prices: Readonly<Record<string, PriceMapEntry>>
  loading: boolean
  spot: MarketSocketSlice
  futures: MarketSocketSlice
}

type Binance24hTicker = {
  e: string
  E: number
  s: string
  c: string
  P: string
}

type MarkPriceUpdate = {
  e: string
  E: number
  s: string
  p: string
  P?: string
  i?: string
  r: string
  T: number
}

type CombinedStreamEnvelope = {
  stream?: string
  data?: unknown
}

export function priceMapKey(symbol: string, market: Market): string {
  return `${symbol.toLowerCase()}|${market}`
}

function normalizeStreamSymbol(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return s.length > 0 ? s : null
}

function buildSpotUrl(symbols: string[]): string {
  const path = symbols.map((s) => `${s}@ticker`).join('/')
  return `${SPOT_COMBINED_WS}?streams=${path}`
}

function buildFuturesMarkUrl(symbols: string[]): string {
  const path = symbols.map((s) => `${s}@markPrice`).join('/')
  return `${FUTURES_COMBINED_WS}?streams=${path}`
}

function parseSpotPayload(payload: unknown): TickerSnapshot | null {
  if (!payload || typeof payload !== 'object') return null
  const d = payload as Partial<Binance24hTicker>
  if (d.e !== '24hrTicker') return null
  if (
    typeof d.s !== 'string' ||
    typeof d.c !== 'string' ||
    typeof d.P !== 'string' ||
    typeof d.E !== 'number'
  ) {
    return null
  }
  return {
    symbol: d.s,
    lastPrice: d.c,
    priceChangePercent: d.P,
    eventTime: d.E,
  }
}

function parseFuturesMarkPayload(payload: unknown): FuturesMarkSnapshot | null {
  if (!payload || typeof payload !== 'object') return null
  const d = payload as Partial<MarkPriceUpdate>
  if (d.e !== 'markPriceUpdate') return null
  if (
    typeof d.s !== 'string' ||
    typeof d.p !== 'string' ||
    typeof d.r !== 'string' ||
    typeof d.T !== 'number' ||
    typeof d.E !== 'number'
  ) {
    return null
  }
  return {
    symbol: d.s,
    markPrice: d.p,
    indexPrice: typeof d.i === 'string' ? d.i : undefined,
    fundingRate: d.r,
    nextFundingTime: d.T,
    eventTime: d.E,
  }
}

function parseCombinedRaw(raw: string): unknown {
  try {
    const msg = JSON.parse(raw) as CombinedStreamEnvelope | Record<string, unknown>
    if (msg && typeof msg === 'object' && 'data' in msg) {
      return (msg as CombinedStreamEnvelope).data
    }
    return msg
  } catch {
    return null
  }
}

function spotEqual(a: TickerSnapshot, b: TickerSnapshot): boolean {
  return (
    a.lastPrice === b.lastPrice &&
    a.priceChangePercent === b.priceChangePercent &&
    a.eventTime === b.eventTime &&
    a.symbol === b.symbol
  )
}

function futuresEqual(a: FuturesMarkSnapshot, b: FuturesMarkSnapshot): boolean {
  return (
    a.markPrice === b.markPrice &&
    a.indexPrice === b.indexPrice &&
    a.fundingRate === b.fundingRate &&
    a.nextFundingTime === b.nextFundingTime &&
    a.eventTime === b.eventTime &&
    a.symbol === b.symbol
  )
}

function uniqSortedSymbols(entries: WatchPriceEntry[], market: Market): string[] {
  const set = new Set<string>()
  for (const e of entries) {
    if (e.market !== market) continue
    const n = normalizeStreamSymbol(e.symbol)
    if (n) set.add(n)
  }
  return [...set].sort()
}

function streamKeyFromList(list: string[]): string {
  return list.join(',')
}

/**
 * Hai kết nối WebSocket gộp stream: Spot (`stream.binance`) & Futures (`fstream.binance`, `@markPrice`).
 * Mỗi thị trường tự reconnect exponential backoff; đóng sạch khi đổi watchlist / market.
 */
export function useRealtimePrice(
  entries: WatchPriceEntry[],
  options: UseRealtimePriceOptions = {},
): UseRealtimePriceResult {
  const reconnectBaseMs = options.reconnectBaseMs ?? 1000
  const reconnectMaxMs = options.reconnectMaxMs ?? 30_000

  const spotSymbols = useMemo(
    () => uniqSortedSymbols(entries, 'spot'),
    [entries],
  )
  const futuresSymbols = useMemo(
    () => uniqSortedSymbols(entries, 'futures'),
    [entries],
  )

  const spotKey = streamKeyFromList(spotSymbols)
  const futuresKey = streamKeyFromList(futuresSymbols)

  const [prices, setPrices] = useState<Record<string, PriceMapEntry>>({})

  const [spotStatus, setSpotStatus] = useState<ConnectionStatus>('idle')
  const [futuresStatus, setFuturesStatus] = useState<ConnectionStatus>('idle')
  const [spotErr, setSpotErr] = useState<string | null>(null)
  const [futErr, setFutErr] = useState<string | null>(null)

  const pendingSpotRef = useRef<Record<string, TickerSnapshot>>({})
  const pendingFutRef = useRef<Record<string, FuturesMarkSnapshot>>({})
  const rafRef = useRef<number | null>(null)

  const spotReconnectAttemptRef = useRef(0)
  const futReconnectAttemptRef = useRef(0)
  const spotReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const futReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spotShouldReconnectRef = useRef(true)
  const futShouldReconnectRef = useRef(true)
  const wsSpotRef = useRef<WebSocket | null>(null)
  const wsFutRef = useRef<WebSocket | null>(null)

  const flushPending = () => {
    rafRef.current = null
    const batchSpot = pendingSpotRef.current
    const batchFut = pendingFutRef.current
    pendingSpotRef.current = {}
    pendingFutRef.current = {}
    if (Object.keys(batchSpot).length === 0 && Object.keys(batchFut).length === 0) {
      return
    }
    setPrices((prev) => {
      let changed = false
      const next = { ...prev }
      for (const [sym, snap] of Object.entries(batchSpot)) {
        const k = priceMapKey(sym, 'spot')
        const old = prev[k]
        const entry: PriceMapEntry = { market: 'spot', snapshot: snap }
        if (!old || old.market !== 'spot' || !spotEqual(old.snapshot, snap)) {
          next[k] = entry
          changed = true
        }
      }
      for (const [sym, snap] of Object.entries(batchFut)) {
        const k = priceMapKey(sym, 'futures')
        const old = prev[k]
        const entry: PriceMapEntry = { market: 'futures', snapshot: snap }
        if (!old || old.market !== 'futures' || !futuresEqual(old.snapshot, snap)) {
          next[k] = entry
          changed = true
        }
      }
      return changed ? next : prev
    })
  }

  const scheduleFlush = () => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(flushPending)
  }

  useEffect(() => {
    const hasSpot = spotSymbols.length > 0
    const hasFut = futuresSymbols.length > 0

    if (!hasSpot && !hasFut) {
      setPrices({})
      setSpotStatus('idle')
      setFuturesStatus('idle')
      setSpotErr(null)
      setFutErr(null)
      return
    }

    spotShouldReconnectRef.current = true
    futShouldReconnectRef.current = true

    const clearSpotTimer = () => {
      if (spotReconnectTimerRef.current != null) {
        clearTimeout(spotReconnectTimerRef.current)
        spotReconnectTimerRef.current = null
      }
    }
    const clearFutTimer = () => {
      if (futReconnectTimerRef.current != null) {
        clearTimeout(futReconnectTimerRef.current)
        futReconnectTimerRef.current = null
      }
    }

    const connectSpot = () => {
      if (spotSymbols.length === 0) return
      clearSpotTimer()
      setSpotErr(null)
      setSpotStatus(
        spotReconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting',
      )
      const ws = new WebSocket(buildSpotUrl(spotSymbols))
      wsSpotRef.current = ws

      ws.onopen = () => {
        spotReconnectAttemptRef.current = 0
        setSpotStatus('open')
      }

      ws.onmessage = (event) => {
        const data = parseCombinedRaw(event.data as string)
        const snap = data ? parseSpotPayload(data) : null
        if (!snap) return
        pendingSpotRef.current[snap.symbol.toLowerCase()] = snap
        scheduleFlush()
      }

      ws.onerror = () => {
        setSpotErr('Spot WebSocket error')
      }

      ws.onclose = () => {
        wsSpotRef.current = null
        setSpotStatus('closed')
        const batch = pendingSpotRef.current
        pendingSpotRef.current = {}
        if (Object.keys(batch).length > 0) {
          setPrices((prev) => {
            let changed = false
            const next = { ...prev }
            for (const [sym, snap] of Object.entries(batch)) {
              const k = priceMapKey(sym, 'spot')
              const old = prev[k]
              const entry: PriceMapEntry = { market: 'spot', snapshot: snap }
              if (!old || old.market !== 'spot' || !spotEqual(old.snapshot, snap)) {
                next[k] = entry
                changed = true
              }
            }
            return changed ? next : prev
          })
        }

        if (!spotShouldReconnectRef.current || spotSymbols.length === 0) return
        const attempt = spotReconnectAttemptRef.current
        const delay = Math.min(reconnectMaxMs, reconnectBaseMs * 2 ** attempt)
        spotReconnectAttemptRef.current = attempt + 1
        setSpotStatus('reconnecting')
        spotReconnectTimerRef.current = setTimeout(() => {
          connectSpot()
        }, delay)
      }
    }

    const connectFut = () => {
      if (futuresSymbols.length === 0) return
      clearFutTimer()
      setFutErr(null)
      setFuturesStatus(
        futReconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting',
      )
      const ws = new WebSocket(buildFuturesMarkUrl(futuresSymbols))
      wsFutRef.current = ws

      ws.onopen = () => {
        futReconnectAttemptRef.current = 0
        setFuturesStatus('open')
      }

      ws.onmessage = (event) => {
        const data = parseCombinedRaw(event.data as string)
        const snap = data ? parseFuturesMarkPayload(data) : null
        if (!snap) return
        pendingFutRef.current[snap.symbol.toLowerCase()] = snap
        scheduleFlush()
      }

      ws.onerror = () => {
        setFutErr('Futures WebSocket error')
      }

      ws.onclose = () => {
        wsFutRef.current = null
        setFuturesStatus('closed')
        const batch = pendingFutRef.current
        pendingFutRef.current = {}
        if (Object.keys(batch).length > 0) {
          setPrices((prev) => {
            let changed = false
            const next = { ...prev }
            for (const [sym, snap] of Object.entries(batch)) {
              const k = priceMapKey(sym, 'futures')
              const old = prev[k]
              const entry: PriceMapEntry = { market: 'futures', snapshot: snap }
              if (!old || old.market !== 'futures' || !futuresEqual(old.snapshot, snap)) {
                next[k] = entry
                changed = true
              }
            }
            return changed ? next : prev
          })
        }

        if (!futShouldReconnectRef.current || futuresSymbols.length === 0) return
        const attempt = futReconnectAttemptRef.current
        const delay = Math.min(reconnectMaxMs, reconnectBaseMs * 2 ** attempt)
        futReconnectAttemptRef.current = attempt + 1
        setFuturesStatus('reconnecting')
        futReconnectTimerRef.current = setTimeout(() => {
          connectFut()
        }, delay)
      }
    }

    if (hasSpot) connectSpot()
    else {
      setSpotStatus('idle')
      setSpotErr(null)
    }

    if (hasFut) connectFut()
    else {
      setFuturesStatus('idle')
      setFutErr(null)
    }

    return () => {
      spotShouldReconnectRef.current = false
      futShouldReconnectRef.current = false
      clearSpotTimer()
      clearFutTimer()

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingSpotRef.current = {}
      pendingFutRef.current = {}

      const wsS = wsSpotRef.current
      wsSpotRef.current = null
      if (wsS && (wsS.readyState === WebSocket.OPEN || wsS.readyState === WebSocket.CONNECTING)) {
        wsS.close()
      }

      const wsF = wsFutRef.current
      wsFutRef.current = null
      if (wsF && (wsF.readyState === WebSocket.OPEN || wsF.readyState === WebSocket.CONNECTING)) {
        wsF.close()
      }

      spotReconnectAttemptRef.current = 0
      futReconnectAttemptRef.current = 0

      setPrices((prev) => {
        const next = { ...prev }
        for (const s of spotSymbols) {
          delete next[priceMapKey(s, 'spot')]
        }
        for (const s of futuresSymbols) {
          delete next[priceMapKey(s, 'futures')]
        }
        return next
      })

      setSpotStatus('idle')
      setFuturesStatus('idle')
    }
  }, [spotKey, futuresKey, reconnectBaseMs, reconnectMaxMs]) // eslint-disable-line react-hooks/exhaustive-deps -- key mã hoá symbol

  const spotAwaiting =
    spotSymbols.length > 0 &&
    spotSymbols.some((s) => {
      const p = prices[priceMapKey(s, 'spot')]
      return !p || p.market !== 'spot'
    })

  const futAwaiting =
    futuresSymbols.length > 0 &&
    futuresSymbols.some((s) => {
      const p = prices[priceMapKey(s, 'futures')]
      return !p || p.market !== 'futures'
    })

  const loading =
    (spotSymbols.length > 0 &&
      (spotStatus === 'connecting' || (spotStatus === 'open' && spotAwaiting))) ||
    (futuresSymbols.length > 0 &&
      (futuresStatus === 'connecting' ||
        (futuresStatus === 'open' && futAwaiting)))

  return {
    prices,
    loading,
    spot: {
      status: spotSymbols.length === 0 ? 'idle' : spotStatus,
      streams: spotSymbols,
      lastError: spotErr,
    },
    futures: {
      status: futuresSymbols.length === 0 ? 'idle' : futuresStatus,
      streams: futuresSymbols,
      lastError: futErr,
    },
  }
}
