import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchFuturesPositions, type BinanceFetchError } from '../api/binanceAccount'
import { decryptString, encryptString, type EncryptedPayload } from '../utils/encryption'

const CREDS_KEY = 'binance-api-credentials'
const BASE_URL_KEY = 'binance-api-base-url'

type StoredCreds = {
  v: 1
  apiKey: EncryptedPayload
  secretKey: EncryptedPayload
}

export type BinanceConnectionStatus = 'disconnected' | 'connected' | 'error'

export type BinanceSyncState = {
  hasCredentials: boolean
  status: BinanceConnectionStatus
  error: string | null
  syncing: boolean
  lastSyncedAt: number | null
  baseUrl: string
  // raw last response (for mapping upstream)
  rawPositions: unknown[]
}

function safeParseCreds(raw: string | null): StoredCreds | null {
  if (!raw) return null
  try {
    const j = JSON.parse(raw) as any
    if (!j || j.v !== 1) return null
    if (!j.apiKey || !j.secretKey) return null
    return j as StoredCreds
  } catch {
    return null
  }
}

function prettyErr(e: unknown): string {
  if (!e) return 'Unknown error'
  const any = e as any
  if (typeof any?.message === 'string' && any.message.trim()) return any.message
  if (typeof any?.msg === 'string' && any.msg.trim()) return any.msg
  return String(e)
}

export function useBinanceSync(enabled: boolean): {
  state: BinanceSyncState
  setBaseUrl: (url: string) => void
  loadCredentials: () => Promise<{ apiKey: string; secretKey: string } | null>
  saveCredentials: (apiKey: string, secretKey: string) => Promise<void>
  clearCredentials: () => void
  testConnection: () => Promise<boolean>
  syncNow: () => Promise<void>
} {
  const [baseUrl, setBaseUrlState] = useState(() => {
    const v = localStorage.getItem(BASE_URL_KEY)
    return v && typeof v === 'string' ? v : 'https://fapi.binance.com'
  })
  const [status, setStatus] = useState<BinanceConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [rawPositions, setRawPositions] = useState<unknown[]>([])

  const setBaseUrl = useCallback((url: string) => {
    const next = url.trim()
    setBaseUrlState(next)
    try {
      localStorage.setItem(BASE_URL_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const loadCredentials = useCallback(async () => {
    const s = safeParseCreds(localStorage.getItem(CREDS_KEY))
    if (!s) return null
    try {
      const [apiKey, secretKey] = await Promise.all([
        decryptString(s.apiKey),
        decryptString(s.secretKey),
      ])
      if (!apiKey || !secretKey) return null
      return { apiKey, secretKey }
    } catch {
      return null
    }
  }, [])

  const saveCredentials = useCallback(async (apiKey: string, secretKey: string) => {
    const a = apiKey.trim()
    const s = secretKey.trim()
    const [ea, es] = await Promise.all([encryptString(a), encryptString(s)])
    const payload: StoredCreds = { v: 1, apiKey: ea, secretKey: es }
    localStorage.setItem(CREDS_KEY, JSON.stringify(payload))
    setError(null)
    setStatus('disconnected')
  }, [])

  const clearCredentials = useCallback(() => {
    localStorage.removeItem(CREDS_KEY)
    setRawPositions([])
    setLastSyncedAt(null)
    setError(null)
    setStatus('disconnected')
  }, [])

  const doFetch = useCallback(async () => {
    const creds = await loadCredentials()
    if (!creds) throw new Error('Missing API credentials')
    const r = await fetchFuturesPositions({
      apiKey: creds.apiKey,
      secretKey: creds.secretKey,
      baseUrl,
    })
    return r
  }, [baseUrl, loadCredentials])

  const testConnection = useCallback(async () => {
    try {
      setError(null)
      const r = await doFetch()
      setRawPositions(r as unknown[])
      setStatus('connected')
      return true
    } catch (e) {
      const msg = prettyErr(e as BinanceFetchError)
      setError(msg)
      setStatus('error')
      return false
    }
  }, [doFetch])

  const syncNow = useCallback(async () => {
    if (!enabled) return
    setSyncing(true)
    try {
      setError(null)
      const r = await doFetch()
      setRawPositions(r as unknown[])
      setLastSyncedAt(Date.now())
      setStatus('connected')
    } catch (e) {
      setStatus('error')
      setError(prettyErr(e))
    } finally {
      setSyncing(false)
    }
  }, [doFetch, enabled])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!enabled) return
    if (!safeParseCreds(localStorage.getItem(CREDS_KEY))) return
    // initial sync on enable
    void syncNow()
    timerRef.current = window.setInterval(() => void syncNow(), 60_000)
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled, syncNow])

  return {
    state: {
      hasCredentials: safeParseCreds(localStorage.getItem(CREDS_KEY)) != null,
      status,
      error,
      syncing,
      lastSyncedAt,
      baseUrl,
      rawPositions,
    },
    setBaseUrl,
    loadCredentials,
    saveCredentials,
    clearCredentials,
    testConnection,
    syncNow,
  }
}

