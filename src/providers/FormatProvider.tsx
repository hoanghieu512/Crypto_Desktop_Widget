import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchUsdVnd } from '../api/fetchUsdVnd'
import {
  buildFormatOptions,
  formatPrice,
  formatPriceAbsChange,
  formatPriceSigned,
  type FormatAsset,
  type FormatCurrency,
  type FormatMode,
  type FormatPriceOptions,
} from '../utils/formatPrice'

const STORAGE_MODE = 'widget-format-mode'
const STORAGE_CURRENCY = 'widget-format-currency'
const STORAGE_RATE = 'widget-format-rate'

const DEFAULT_RATE = 25_000

function loadMode(): FormatMode {
  try {
    const r = localStorage.getItem(STORAGE_MODE)
    if (r === 'full' || r === 'compact') return r
  } catch {
    /* ignore */
  }
  return 'compact'
}

function loadCurrency(): FormatCurrency {
  try {
    const r = localStorage.getItem(STORAGE_CURRENCY)
    if (r === 'VND' || r === 'USD') return r
  } catch {
    /* ignore */
  }
  return 'VND'
}

function loadRate(): number {
  try {
    const r = localStorage.getItem(STORAGE_RATE)
    if (r) {
      const n = Number(r)
      if (Number.isFinite(n) && n > 0) return n
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_RATE
}

export type FormatContextValue = {
  mode: FormatMode
  setMode: (m: FormatMode) => void
  currency: FormatCurrency
  setCurrency: (c: FormatCurrency) => void
  /** USD/VND — VND per 1 USD */
  rate: number
  setRate: (r: number) => void
  /** Shorthand: `formatPrice(value, buildFormatOptions(asset, mode, currency, rate))` */
  formatPrice: (value: number, asset: FormatAsset) => string
  formatPriceSigned: (value: number, asset: FormatAsset) => string
  formatPriceAbsChange: (value: number, asset: FormatAsset) => string
  optionsFor: (asset: FormatAsset) => FormatPriceOptions
}

const FormatContext = createContext<FormatContextValue | null>(null)

export function FormatProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<FormatMode>(loadMode)
  const [currency, setCurrencyState] = useState<FormatCurrency>(loadCurrency)
  const [rate, setRateState] = useState<number>(loadRate)

  const setMode = useCallback((m: FormatMode) => setModeState(m), [])
  const setCurrency = useCallback((c: FormatCurrency) => setCurrencyState(c), [])
  const setRate = useCallback((r: number) => {
    if (Number.isFinite(r) && r > 0) setRateState(r)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MODE, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CURRENCY, currency)
    } catch {
      /* ignore */
    }
  }, [currency])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RATE, String(rate))
    } catch {
      /* ignore */
    }
  }, [rate])

  useEffect(() => {
    let cancelled = false
    const pull = () => {
      void fetchUsdVnd().then((res) => {
        if (
          !cancelled &&
          res.ok &&
          Number.isFinite(res.rate) &&
          res.rate > 0
        ) {
          setRateState(res.rate)
        }
      })
    }
    pull()
    const id = window.setInterval(pull, 300_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const optionsFor = useCallback(
    (asset: FormatAsset) => buildFormatOptions(asset, mode, currency, rate),
    [mode, currency, rate],
  )

  const fmt = useCallback(
    (value: number, asset: FormatAsset) => formatPrice(value, optionsFor(asset)),
    [optionsFor],
  )

  const fmtSigned = useCallback(
    (value: number, asset: FormatAsset) => formatPriceSigned(value, optionsFor(asset)),
    [optionsFor],
  )

  const fmtAbs = useCallback(
    (value: number, asset: FormatAsset) => formatPriceAbsChange(value, optionsFor(asset)),
    [optionsFor],
  )

  const value = useMemo(
    () => ({
      mode,
      setMode,
      currency,
      setCurrency,
      rate,
      setRate,
      formatPrice: fmt,
      formatPriceSigned: fmtSigned,
      formatPriceAbsChange: fmtAbs,
      optionsFor,
    }),
    [mode, setMode, currency, setCurrency, rate, setRate, fmt, fmtSigned, fmtAbs, optionsFor],
  )

  return <FormatContext.Provider value={value}>{children}</FormatContext.Provider>
}

export function useFormat(): FormatContextValue {
  const ctx = useContext(FormatContext)
  if (!ctx) {
    throw new Error('useFormat must be used within FormatProvider')
  }
  return ctx
}
