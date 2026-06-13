/* eslint-disable react-hooks/set-state-in-effect -- WebSocket: reset state khi đổi stream / teardown */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

const SPOT_COMBINED_WS = 'wss://stream.binance.com:9443/stream'
const FUTURES_COMBINED_WS = 'wss://fstream.binance.com/stream'

/** REST mark price (futures). Dùng làm fallback khi WS fstream im lặng. */
const FUTURES_PREMIUM_INDEX_URL = 'https://fapi.binance.com/fapi/v1/premiumIndex'
/** Nhịp poll REST khi WS không đẩy dữ liệu. */
const FUT_POLL_INTERVAL_MS = 3000
/** Quá ngần này không có tick WS → coi WS "im lặng" và bật REST poll. */
const FUT_WS_SILENCE_MS = 5000

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
  | { market: 'spot'; snapshot: TickerSnapshot; lastUpdated: number }
  | { market: 'futures'; snapshot: FuturesMarkSnapshot; lastUpdated: number }

/** Trạng thái socket từng thị trường (chi tiết) */
export type MarketWsStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed'

/** Trạng thái gộp cho UI (crypto dashboard) */
export type RealtimeConnectionStatus =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'error'

/** @deprecated Dùng MarketWsStatus */
export type ConnectionStatus = MarketWsStatus

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
  status: MarketWsStatus
  streams: readonly string[]
  lastError: string | null
}

export type UseRealtimePriceResult = {
  /** Khóa: `${symbol}|spot` hoặc `${symbol}|futures` (symbol đã lowercase) */
  prices: Readonly<Record<string, PriceMapEntry>>
  loading: boolean
  /** True while any subscribed market socket is in `connecting` */
  isConnecting: boolean
  /** True while any subscribed market socket is reconnecting (or closed with backoff) */
  isReconnecting: boolean
  /** Gộp spot + futures: live / đang nối / tái nối / lỗi */
  connectionStatus: RealtimeConnectionStatus
  /** Đóng socket và mở lại (Spot + Futures hub) */
  retryConnection: () => void
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

type FuturesHubListener = {
  id: string
  symbolsKey: string
  symbols: readonly string[]
  onSnap: (snap: FuturesMarkSnapshot) => void
  onStatus: (status: MarketWsStatus, err: string | null, streams: readonly string[]) => void
}

/**
 * Single shared futures mark WS for the whole app.
 * This keeps Portfolio + Simulator in sync (same tick source).
 */
const futuresHub = (() => {
  let ws: WebSocket | null = null
  let status: MarketWsStatus = 'idle'
  let lastError: string | null = null
  let listeners = new Map<string, FuturesHubListener>()

  let desiredSymbols: string[] = []
  let desiredKey = ''

  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let shouldReconnect = true

  // Fallback REST: nhiều mạng (vd. VN) bắt tay được fstream WS (onopen → "OK")
  // nhưng KHÔNG nhận message nào. Khi WS im lặng, poll mark price qua fapi REST
  // và đẩy vào cùng listeners → row / simulator / portfolio đều có giá chung nguồn.
  let lastTickAt = 0
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let pollInFlight = false

  const notifyStatus = () => {
    const streams = desiredSymbols.map((s) => `${s}@markPrice`)
    for (const l of listeners.values()) l.onStatus(status, lastError, streams)
  }

  const dispatchSnap = (snap: FuturesMarkSnapshot) => {
    for (const l of listeners.values()) l.onSnap(snap)
  }

  const wsAlive = () => lastTickAt > 0 && Date.now() - lastTickAt < FUT_WS_SILENCE_MS

  const doPoll = async () => {
    if (pollInFlight || desiredSymbols.length === 0 || wsAlive()) return
    const symbols = desiredSymbols
    pollInFlight = true
    try {
      const snaps = await Promise.all(symbols.map(fetchFuturesMarkViaRest))
      // WS sống lại trong lúc fetch → bỏ kết quả poll (ưu tiên tick WS).
      if (wsAlive()) return
      for (const snap of snaps) {
        if (snap) dispatchSnap(snap)
      }
    } finally {
      pollInFlight = false
    }
  }

  const startPolling = () => {
    if (pollTimer != null) return
    pollTimer = setInterval(() => void doPoll(), FUT_POLL_INTERVAL_MS)
    // Primer: nếu WS không đẩy trong ~1.2s thì vẫn có giá sớm.
    setTimeout(() => void doPoll(), 1200)
  }

  const stopPolling = () => {
    if (pollTimer != null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const clearTimer = () => {
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const closeWs = () => {
    if (!ws) return
    try {
      ws.close()
    } catch {
      /* ignore */
    }
    ws = null
  }

  const computeUnion = () => {
    const set = new Set<string>()
    for (const l of listeners.values()) {
      for (const s of l.symbols) set.add(s)
    }
    desiredSymbols = [...set].sort()
    desiredKey = streamKeyFromList(desiredSymbols)
  }

  const connect = () => {
    clearTimer()
    closeWs()

    if (desiredSymbols.length === 0) {
      stopPolling()
      status = 'idle'
      lastError = null
      notifyStatus()
      return
    }

    // Luôn bật REST poll fallback (tự bỏ qua khi WS đang đẩy tick).
    startPolling()

    lastError = null
    status = reconnectAttempt > 0 ? 'reconnecting' : 'connecting'
    notifyStatus()

    const nextWs = new WebSocket(buildFuturesMarkUrl(desiredSymbols))
    ws = nextWs

    nextWs.onopen = () => {
      reconnectAttempt = 0
      status = 'open'
      notifyStatus()
    }

    nextWs.onmessage = (event) => {
      const data = parseCombinedRaw(event.data as string)
      const snap = data ? parseFuturesMarkPayload(data) : null
      if (!snap) return
      lastTickAt = Date.now()
      dispatchSnap(snap)
    }

    nextWs.onerror = () => {
      lastError = 'Futures WebSocket error'
      notifyStatus()
    }

    nextWs.onclose = () => {
      // Chỉ null hoá khi đúng socket hiện tại (tránh xoá ref của WS mới mở).
      if (ws === nextWs) ws = null
      status = 'closed'
      notifyStatus()
      if (!shouldReconnect || desiredSymbols.length === 0) return
      const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt)
      reconnectAttempt += 1
      status = 'reconnecting'
      notifyStatus()
      reconnectTimer = setTimeout(() => connect(), delay)
    }
  }

  const refresh = () => {
    const prevKey = desiredKey
    computeUnion()
    if (desiredKey !== prevKey) connect()
    else notifyStatus()
  }

  return {
    subscribe: (listener: FuturesHubListener) => {
      listeners.set(listener.id, listener)
      refresh()
      // immediate status push
      listener.onStatus(status, lastError, desiredSymbols.map((s) => `${s}@markPrice`))
      return () => {
        listeners.delete(listener.id)
        refresh()
      }
    },
    setShouldReconnect: (v: boolean) => {
      shouldReconnect = v
      if (!shouldReconnect) {
        clearTimer()
        closeWs()
        stopPolling()
        status = desiredSymbols.length > 0 ? 'closed' : 'idle'
        notifyStatus()
      } else {
        connect()
      }
    },
  }
})()

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

type PremiumIndexResponse = {
  symbol?: string
  markPrice?: string
  indexPrice?: string
  lastFundingRate?: string
  nextFundingTime?: number
  time?: number
}

/**
 * Lấy mark price futures qua REST (`/fapi/v1/premiumIndex`) — fallback khi WS
 * fstream im lặng. Trả về cùng shape FuturesMarkSnapshot để đẩy chung pipeline.
 */
async function fetchFuturesMarkViaRest(
  symbol: string,
): Promise<FuturesMarkSnapshot | null> {
  try {
    const res = await fetch(
      `${FUTURES_PREMIUM_INDEX_URL}?symbol=${symbol.toUpperCase()}`,
    )
    if (!res.ok) return null
    const d = (await res.json()) as PremiumIndexResponse
    if (typeof d.symbol !== 'string' || typeof d.markPrice !== 'string') {
      return null
    }
    const markNum = Number(d.markPrice)
    if (!Number.isFinite(markNum) || markNum <= 0) return null
    return {
      symbol: d.symbol,
      markPrice: d.markPrice,
      indexPrice: typeof d.indexPrice === 'string' ? d.indexPrice : undefined,
      fundingRate: typeof d.lastFundingRate === 'string' ? d.lastFundingRate : '0',
      nextFundingTime:
        typeof d.nextFundingTime === 'number' ? d.nextFundingTime : 0,
      eventTime: typeof d.time === 'number' ? d.time : Date.now(),
    }
  } catch {
    return null
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

export function deriveRealtimeConnectionStatus(
  spot: MarketSocketSlice,
  futures: MarketSocketSlice,
): RealtimeConnectionStatus {
  const sA = spot.streams.length > 0
  const fA = futures.streams.length > 0
  if (!sA && !fA) return 'live'

  const sOpen = !sA || spot.status === 'open'
  const fOpen = !fA || futures.status === 'open'
  if (sOpen && fOpen) return 'live'

  const sRec =
    sA && (spot.status === 'reconnecting' || spot.status === 'closed')
  const fRec =
    fA && (futures.status === 'reconnecting' || futures.status === 'closed')
  if (sRec || fRec) return 'reconnecting'

  const sCon = sA && spot.status === 'connecting'
  const fCon = fA && futures.status === 'connecting'
  if (sCon || fCon) return 'connecting'

  const errSpot = sA && spot.lastError != null && !sOpen
  const errFut = fA && futures.lastError != null && !fOpen
  if (errSpot || errFut) return 'error'

  return 'connecting'
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

  const [spotStatus, setSpotStatus] = useState<MarketWsStatus>('idle')
  const [futuresStatus, setFuturesStatus] = useState<MarketWsStatus>('idle')
  const [spotErr, setSpotErr] = useState<string | null>(null)
  const [futErr, setFutErr] = useState<string | null>(null)
  const [reconnectNonce, setReconnectNonce] = useState(0)

  const retryConnection = useCallback(() => {
    setReconnectNonce((n) => n + 1)
  }, [])

  const pendingSpotRef = useRef<Record<string, TickerSnapshot>>({})
  const pendingFutRef = useRef<Record<string, FuturesMarkSnapshot>>({})
  const rafRef = useRef<number | null>(null)

  // Khoá listener riêng cho từng instance hook — tránh đụng id giữa watchlist
  // và portfolio khi trùng tập symbol (Map sẽ ghi đè, một bên mất dữ liệu).
  const instanceId = useId()
  const spotReconnectAttemptRef = useRef(0)
  const spotReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spotShouldReconnectRef = useRef(true)
  const wsSpotRef = useRef<WebSocket | null>(null)
  const futUnsubRef = useRef<null | (() => void)>(null)

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
        const entry: PriceMapEntry = {
          market: 'spot',
          snapshot: snap,
          lastUpdated: Date.now(),
        }
        if (!old || old.market !== 'spot' || !spotEqual(old.snapshot, snap)) {
          next[k] = entry
          changed = true
        }
      }
      for (const [sym, snap] of Object.entries(batchFut)) {
        const k = priceMapKey(sym, 'futures')
        const old = prev[k]
        const entry: PriceMapEntry = {
          market: 'futures',
          snapshot: snap,
          lastUpdated: Date.now(),
        }
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

    const clearSpotTimer = () => {
      if (spotReconnectTimerRef.current != null) {
        clearTimeout(spotReconnectTimerRef.current)
        spotReconnectTimerRef.current = null
      }
    }
    const clearFutSub = () => {
      if (futUnsubRef.current) {
        futUnsubRef.current()
        futUnsubRef.current = null
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
              const entry: PriceMapEntry = {
                market: 'spot',
                snapshot: snap,
                lastUpdated: Date.now(),
              }
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

    const subFutures = () => {
      if (futuresSymbols.length === 0) return
      clearFutSub()
      setFutErr(null)
      // Stable id per hook instance + symbol set.
      const id = `${instanceId}|fut|${futuresKey}`
      futUnsubRef.current = futuresHub.subscribe({
        id,
        symbolsKey: futuresKey,
        symbols: futuresSymbols,
        onSnap: (snap) => {
          pendingFutRef.current[snap.symbol.toLowerCase()] = snap
          scheduleFlush()
        },
        onStatus: (st, err) => {
          setFuturesStatus(st)
          setFutErr(err)
        },
      })
    }

    if (hasSpot) connectSpot()
    else {
      setSpotStatus('idle')
      setSpotErr(null)
    }

    if (hasFut) subFutures()
    else {
      setFuturesStatus('idle')
      setFutErr(null)
    }

    return () => {
      spotShouldReconnectRef.current = false
      clearSpotTimer()
      clearFutSub()

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

      spotReconnectAttemptRef.current = 0

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
  }, [spotKey, futuresKey, reconnectNonce, reconnectBaseMs, reconnectMaxMs]) // eslint-disable-line react-hooks/exhaustive-deps -- key mã hoá symbol

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

  const spotSlice: MarketSocketSlice = {
    status: spotSymbols.length === 0 ? 'idle' : spotStatus,
    streams: spotSymbols,
    lastError: spotErr,
  }
  const futuresSlice: MarketSocketSlice = {
    status: futuresSymbols.length === 0 ? 'idle' : futuresStatus,
    streams: futuresSymbols,
    lastError: futErr,
  }

  const connectionStatus = deriveRealtimeConnectionStatus(spotSlice, futuresSlice)

  return {
    prices,
    loading,
    isConnecting: connectionStatus === 'connecting',
    isReconnecting: connectionStatus === 'reconnecting',
    connectionStatus,
    retryConnection,
    spot: spotSlice,
    futures: futuresSlice,
  }
}
