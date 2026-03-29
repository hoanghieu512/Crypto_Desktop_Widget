import type { PriceChangeInfo } from '../../hooks/usePriceMovement'

type Props = {
  change: PriceChangeInfo
  formatAbsolute: (n: number) => string
  formatPercent: (n: number) => string
  className?: string
}

function dirClass(d: PriceChangeInfo['direction']): string {
  if (d === 'up') return 'text-emerald-400'
  if (d === 'down') return 'text-rose-400'
  return 'text-slate-500'
}

export function PriceChangeDisplay({
  change,
  formatAbsolute,
  formatPercent,
  className = '',
}: Props) {
  if (
    change.absolute == null ||
    change.percent == null ||
    change.direction == null
  ) {
    return (
      <span className={`text-[9px] text-slate-600 ${className}`}>—</span>
    )
  }

  if (change.direction === 'flat') {
    return (
      <span className={`text-[9px] text-slate-500 ${className}`}>0 · 0%</span>
    )
  }

  const sign = change.absolute > 0 ? '+' : change.absolute < 0 ? '−' : ''
  const ps =
    change.percent > 0 ? '+' : change.percent < 0 ? '−' : ''

  return (
    <span className={`text-[9px] font-mono ${dirClass(change.direction)} ${className}`}>
      {sign}
      {formatAbsolute(change.absolute)} · {ps}
      {formatPercent(change.percent)}
    </span>
  )
}
