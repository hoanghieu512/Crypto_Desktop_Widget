/**
 * Centralized display formatting. Raw API values are never mutated.
 */

export type FormatAsset = 'crypto' | 'gold' | 'silver'
export type FormatMode = 'compact' | 'full'
export type FormatCurrency = 'VND' | 'USD'

export type FormatPriceOptions = {
  asset: FormatAsset
  mode: FormatMode
  currency: FormatCurrency
  /** VND per 1 USD (USD/VND) */
  rate: number
}

function sourceIsUsd(asset: FormatAsset): boolean {
  return asset === 'crypto'
}

/** Convert stored value into the target display currency. */
export function toDisplayAmount(
  value: number,
  asset: FormatAsset,
  currency: FormatCurrency,
  rate: number,
): number | null {
  if (!Number.isFinite(value)) return null
  if (!Number.isFinite(rate) || rate <= 0) return null
  const srcUsd = sourceIsUsd(asset)
  if (currency === 'USD' && srcUsd) return value
  if (currency === 'VND' && !srcUsd) return value
  if (srcUsd && currency === 'VND') return value * rate
  return value / rate
}

/** Compact suffix decimals by asset (spec: crypto 2, gold 0–1 → use 1, silver 1–2 → use 2). */
function compactDecimals(asset: FormatAsset): number {
  if (asset === 'crypto') return 2
  if (asset === 'gold') return 1
  return 2
}

function formatCompactMagnitude(abs: number, decimals: number): string {
  if (abs >= 1e9) return `${(abs / 1e9).toFixed(decimals)}B`
  if (abs >= 1e6) return `${(abs / 1e6).toFixed(decimals)}M`
  if (abs >= 1e3) return `${(abs / 1e3).toFixed(decimals)}k`
  return abs.toFixed(decimals)
}

/** Full mode precision: crypto 2 dp (small values use significant digits); gold 0–1; silver 1–2. */
function formatFullNumber(n: number, currency: FormatCurrency, asset: FormatAsset): string {
  if (currency === 'VND') {
    if (asset === 'crypto') {
      return n.toLocaleString('vi-VN', { maximumFractionDigits: 0, minimumFractionDigits: 0 })
    }
    const maxFrac = asset === 'gold' ? 1 : 2
    return n.toLocaleString('vi-VN', {
      maximumFractionDigits: maxFrac,
      minimumFractionDigits: 0,
    })
  }
  if (asset === 'crypto') {
    if (n >= 1) {
      return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return n.toLocaleString('en-US', { maximumSignificantDigits: 6, minimumSignificantDigits: 2 })
  }
  const maxFrac = asset === 'gold' ? 1 : 2
  return n.toLocaleString('en-US', {
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: 0,
  })
}

function attachCurrency(formattedCore: string, currency: FormatCurrency): string {
  if (currency === 'VND') return `${formattedCore} ₫`
  return `$${formattedCore}`
}

/**
 * Format a single numeric price.
 * - Crypto feed values are **USD**; gold/silver are **VND/lượng**.
 * - When `currency` is USD, values are converted with `rate` (VND per USD).
 */
export function formatPrice(value: number, options: FormatPriceOptions): string {
  if (!Number.isFinite(value)) return '—'
  const { asset, mode, currency, rate } = options
  const display = toDisplayAmount(value, asset, currency, rate)
  if (display == null) return '—'

  const sign = display < 0 ? '-' : ''
  const abs = Math.abs(display)

  if (mode === 'compact') {
    const dec = compactDecimals(asset)
    const core = formatCompactMagnitude(abs, dec)
    return attachCurrency(`${sign}${core}`, currency)
  }

  const core = formatFullNumber(abs, currency, asset)
  return attachCurrency(`${sign}${core}`, currency)
}

export function formatPriceSigned(value: number, options: FormatPriceOptions): string {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  const body = formatPrice(Math.abs(value), options)
  if (body === '—') return '—'
  return `${sign}${body}`
}

export function formatPriceAbsChange(value: number, options: FormatPriceOptions): string {
  return formatPrice(Math.abs(value), options)
}

export function formatUnitHint(asset: FormatAsset, currency: FormatCurrency, mode: FormatMode): string {
  const perLuong = asset === 'crypto' ? '' : ' / lượng'
  const cur = currency === 'VND' ? 'VND' : 'USD'
  if (mode === 'compact') {
    return `Hiển thị: ${cur}${perLuong} · Compact (k · M · B)`
  }
  return `Đơn vị: ${cur}${perLuong} · Full`
}

export function buildFormatOptions(
  asset: FormatAsset,
  mode: FormatMode,
  currency: FormatCurrency,
  rate: number,
): FormatPriceOptions {
  return { asset, mode, currency, rate }
}
