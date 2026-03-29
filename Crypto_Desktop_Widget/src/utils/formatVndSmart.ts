/**
 * Compact VND display for metal prices (per lượng).
 * UI-only; does not alter source numbers.
 */

export type VndSmartScale = 'million' | 'thousand'

const M = 1_000_000
const K = 1_000

/**
 * Single-value compact form (trading style):
 * - |value| ≥ 1_000_000 → millions, e.g. 172_800_000 → "172.8M"
 * - otherwise → thousands, e.g. 850_000 → "850.0k"
 * Preserves sign. One decimal place.
 */
export function formatVndSmart(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= M) {
    return `${sign}${(abs / M).toFixed(1)}M`
  }
  return `${sign}${(abs / K).toFixed(1)}k`
}

/** Choose one scale so all level prices on a card use the same unit. */
export function pickVndSmartScale(values: readonly number[]): VndSmartScale {
  const finite = values.filter((v) => Number.isFinite(v)).map((v) => Math.abs(v))
  if (finite.length === 0) return 'million'
  return Math.max(...finite) >= M ? 'million' : 'thousand'
}

function scaledMagnitude(abs: number, scale: VndSmartScale): string {
  const div = scale === 'million' ? M : K
  return (abs / div).toFixed(1)
}

/** Level price in fixed scale (no auto flip per cell). Suffix M or k matches scale. */
export function formatVndInScale(value: number, scale: VndSmartScale): string {
  if (!Number.isFinite(value)) return '—'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const suf = scale === 'million' ? 'M' : 'k'
  return `${sign}${scaledMagnitude(abs, scale)}${suf}`
}

export function formatSignedVndInScale(value: number, scale: VndSmartScale): string {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const suf = scale === 'million' ? 'M' : 'k'
  return `${sign}${scaledMagnitude(abs, scale)}${suf}`
}

export function formatAbsVndInScale(value: number, scale: VndSmartScale): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const suf = scale === 'million' ? 'M' : 'k'
  return `${scaledMagnitude(abs, scale)}${suf}`
}

export function vndSmartUnitLabel(scale: VndSmartScale): string {
  return scale === 'million' ? 'Đơn vị: triệu VND/lượng' : 'Đơn vị: nghìn VND/lượng'
}

/** Full VND string (e.g. toggle / tooltip). */
export function formatVndFull(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${value.toLocaleString('vi-VN')} ₫`
}

export function formatSignedVndFull(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString('vi-VN')} ₫`
}
