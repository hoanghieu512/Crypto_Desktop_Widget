import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PriceAlert, PriceAlertSettings, AlertCondition } from '../types/alerts'

const STORAGE_KEY = 'price-alerts-v1'
const SETTINGS_KEY = 'price-alerts-settings-v1'
const EVT = 'price-alerts:change'

function newId(): string {
  return crypto.randomUUID()
}

function normalizeSymbol(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function safeParseAlerts(raw: string | null): PriceAlert[] {
  if (!raw) return []
  try {
    const j = JSON.parse(raw) as unknown
    if (!Array.isArray(j)) return []
    return j
      .filter(Boolean)
      .map((a: any) => ({
        id: String(a.id ?? newId()),
        symbol: normalizeSymbol(String(a.symbol ?? '')),
        targetPrice: Number(a.targetPrice),
        condition: (a.condition === 'below' ? 'below' : 'above') as AlertCondition,
        enabled: Boolean(a.enabled),
        triggered: Boolean(a.triggered),
        createdAt: Number(a.createdAt ?? Date.now()),
        triggeredAt: a.triggeredAt != null ? Number(a.triggeredAt) : undefined,
      }))
      .filter((a) => a.symbol.length > 0 && Number.isFinite(a.targetPrice) && a.targetPrice > 0)
  } catch {
    return []
  }
}

function safeParseSettings(raw: string | null): PriceAlertSettings {
  if (!raw) return { v: 1, soundEnabled: false }
  try {
    const j = JSON.parse(raw) as any
    if (!j || j.v !== 1) return { v: 1, soundEnabled: false }
    return { v: 1, soundEnabled: Boolean(j.soundEnabled) }
  } catch {
    return { v: 1, soundEnabled: false }
  }
}

function persistAlerts(alerts: PriceAlert[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
    window.dispatchEvent(new CustomEvent(EVT))
  } catch {
    /* ignore */
  }
}

function persistSettings(s: PriceAlertSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
    window.dispatchEvent(new CustomEvent(EVT))
  } catch {
    /* ignore */
  }
}

function playBeep() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.04
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
    osc.onended = () => void ctx.close()
  } catch {
    /* ignore */
  }
}

export type AlertToast = {
  id: string
  title: string
  message: string
  createdAt: number
  symbol?: string
}

export function usePriceAlerts(params: {
  /** Latest price per symbol (USDT). Symbol keys should be uppercase like BTCUSDT. */
  pricesBySymbol: Readonly<Record<string, number | null | undefined>>
}): {
  alerts: PriceAlert[]
  settings: PriceAlertSettings
  toasts: AlertToast[]
  activeEnabledCount: number
  addAlert: (a: { symbol: string; condition: AlertCondition; targetPrice: number }) => void
  updateAlert: (id: string, patch: Partial<Omit<PriceAlert, 'id' | 'createdAt'>>) => void
  deleteAlert: (id: string) => void
  resetAlert: (id: string) => void
  setSoundEnabled: (v: boolean) => void
  dismissToast: (id: string) => void
} {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => safeParseAlerts(localStorage.getItem(STORAGE_KEY)))
  const [settings, setSettings] = useState<PriceAlertSettings>(() => safeParseSettings(localStorage.getItem(SETTINGS_KEY)))
  const [toasts, setToasts] = useState<AlertToast[]>([])

  useEffect(() => {
    const on = () => {
      setAlerts(safeParseAlerts(localStorage.getItem(STORAGE_KEY)))
      setSettings(safeParseSettings(localStorage.getItem(SETTINGS_KEY)))
    }
    window.addEventListener(EVT, on as any)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener(EVT, on as any)
      window.removeEventListener('storage', on)
    }
  }, [])

  const activeEnabledCount = useMemo(
    () => alerts.filter((a) => a.enabled && !a.triggered).length,
    [alerts],
  )

  const addAlert = useCallback((a: { symbol: string; condition: AlertCondition; targetPrice: number }) => {
    const symbol = normalizeSymbol(a.symbol)
    const targetPrice = Number(a.targetPrice)
    if (!symbol || !Number.isFinite(targetPrice) || targetPrice <= 0) return
    const next: PriceAlert = {
      id: newId(),
      symbol,
      targetPrice,
      condition: a.condition === 'below' ? 'below' : 'above',
      enabled: true,
      triggered: false,
      createdAt: Date.now(),
    }
    setAlerts((cur) => {
      const out = [next, ...cur]
      persistAlerts(out)
      return out
    })
  }, [])

  const updateAlert = useCallback((id: string, patch: Partial<Omit<PriceAlert, 'id' | 'createdAt'>>) => {
    setAlerts((cur) => {
      const out = cur.map((a) => {
        if (a.id !== id) return a
        const symbol = patch.symbol != null ? normalizeSymbol(String(patch.symbol)) : a.symbol
        const targetPrice = patch.targetPrice != null ? Number(patch.targetPrice) : a.targetPrice
        return {
          ...a,
          ...patch,
          symbol,
          targetPrice,
          condition: patch.condition === 'below' ? 'below' : patch.condition === 'above' ? 'above' : a.condition,
        }
      })
      persistAlerts(out)
      return out
    })
  }, [])

  const deleteAlert = useCallback((id: string) => {
    setAlerts((cur) => {
      const out = cur.filter((a) => a.id !== id)
      persistAlerts(out)
      return out
    })
  }, [])

  const resetAlert = useCallback((id: string) => {
    updateAlert(id, { triggered: false, triggeredAt: undefined, enabled: true })
  }, [updateAlert])

  const setSoundEnabled = useCallback((v: boolean) => {
    setSettings(() => {
      const next: PriceAlertSettings = { v: 1, soundEnabled: Boolean(v) }
      persistSettings(next)
      return next
    })
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id))
  }, [])

  const lastTriggerRef = useRef<Record<string, number>>({})
  useEffect(() => {
    const pending = alerts.filter((a) => a.enabled && !a.triggered)
    if (pending.length === 0) return

    for (const a of pending) {
      const p = params.pricesBySymbol[a.symbol]
      const price = p == null ? Number.NaN : Number(p)
      if (!Number.isFinite(price) || price <= 0) continue

      const shouldTrigger =
        (a.condition === 'above' && price >= a.targetPrice) ||
        (a.condition === 'below' && price <= a.targetPrice)

      if (!shouldTrigger) continue

      const now = Date.now()
      const last = lastTriggerRef.current[a.id] ?? 0
      if (now - last < 2000) continue // minimal cooldown
      lastTriggerRef.current[a.id] = now

      // Mark triggered + auto-disable
      setAlerts((cur) => {
        const out = cur.map((x) =>
          x.id === a.id ? { ...x, triggered: true, triggeredAt: now, enabled: false } : x,
        )
        persistAlerts(out)
        return out
      })

      const title = 'Price Alert'
      const cond = a.condition === 'above' ? 'above' : 'below'
      const message = `${a.symbol} crossed ${cond} ${a.targetPrice} (now ${price})`
      const toast: AlertToast = { id: newId(), title, message, createdAt: now, symbol: a.symbol }
      setToasts((prev) => [toast, ...prev].slice(0, 5))

      if (settings.soundEnabled) playBeep()

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(title, { body: message })
        } catch {
          /* ignore */
        }
      }
    }
  }, [alerts, params.pricesBySymbol, settings.soundEnabled])

  return {
    alerts,
    settings,
    toasts,
    activeEnabledCount,
    addAlert,
    updateAlert,
    deleteAlert,
    resetAlert,
    setSoundEnabled,
    dismissToast,
  }
}

