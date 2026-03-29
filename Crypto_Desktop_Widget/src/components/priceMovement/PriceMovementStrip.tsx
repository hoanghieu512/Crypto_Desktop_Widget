import { useMemo } from 'react'
import { usePriceMovement } from '../../hooks/usePriceMovement'
import type { PriceTrend } from '../../utils/priceMovementMath'
import { MiniSparkline } from './MiniSparkline'
import { PriceChangeDisplay } from './PriceChangeDisplay'
import { VolatilityBadge } from './VolatilityBadge'

import './price-movement.css'

type Props = {
  /** Giá hiện tại (ví dụ giữa VND/lượng) */
  value: number | null
  sampleNonce: number
  enabled: boolean
  formatAbsolute: (n: number) => string
  /** formatPercent nhận đã là % (số 0.12 = 0.12%) */
  formatPercent: (n: number) => string
  className?: string
}

function trendLabel(t: PriceTrend): string {
  switch (t) {
    case 'up':
      return '↑ Lên'
    case 'down':
      return '↓ Xuống'
    default:
      return '↔ Đi ngang'
  }
}

function trendClass(t: PriceTrend): string {
  if (t === 'up') return 'text-emerald-400/90'
  if (t === 'down') return 'text-rose-400/90'
  return 'text-slate-500'
}

export function PriceMovementStrip({
  value,
  sampleNonce,
  enabled,
  formatAbsolute,
  formatPercent,
  className = '',
}: Props) {
  const m = usePriceMovement(value, { enabled, sampleNonce, maxPoints: 16 })

  const flashClass = useMemo(() => {
    if (m.flashDirection === 'up') return 'price-movement-flash-up'
    if (m.flashDirection === 'down') return 'price-movement-flash-down'
    return ''
  }, [m.flashDirection])

  return (
    <div
      className={`rounded-md px-1.5 py-1 transition-colors duration-300 ${flashClass} ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[9px] text-slate-500">Δ lần trước</span>
        <PriceChangeDisplay
          change={m.change}
          formatAbsolute={formatAbsolute}
          formatPercent={formatPercent}
        />
        <span className={`text-[9px] font-medium ${trendClass(m.trend)}`}>
          {trendLabel(m.trend)}
        </span>
        <MiniSparkline values={m.history} width={52} height={20} trend={m.sparklineTrend} />
        <VolatilityBadge level={m.volatilityLevel} cvPercent={m.volatilityCvPercent} />
      </div>
    </div>
  )
}
