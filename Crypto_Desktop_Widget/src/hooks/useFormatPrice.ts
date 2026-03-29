import { useCallback, useMemo } from 'react'
import { useFormat } from '../providers/FormatProvider'
import { formatUnitHint, type FormatAsset } from '../utils/formatPrice'

/**
 * Memoized helpers for one asset class using global mode, currency, and rate.
 */
export function useFormatPrice(asset: FormatAsset) {
  const ctx = useFormat()

  const format = useCallback((value: number) => ctx.formatPrice(value, asset), [ctx, asset])
  const formatSigned = useCallback((value: number) => ctx.formatPriceSigned(value, asset), [ctx, asset])
  const formatAbsChange = useCallback(
    (value: number) => ctx.formatPriceAbsChange(value, asset),
    [ctx, asset],
  )
  const unitHint = useMemo(
    () => formatUnitHint(asset, ctx.currency, ctx.mode),
    [asset, ctx.currency, ctx.mode],
  )
  const options = useMemo(() => ctx.optionsFor(asset), [ctx, asset])

  return {
    format,
    formatSigned,
    formatAbsChange,
    unitHint,
    mode: ctx.mode,
    currency: ctx.currency,
    rate: ctx.rate,
    options,
  }
}
