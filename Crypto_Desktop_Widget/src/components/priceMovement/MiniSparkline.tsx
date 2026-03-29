import { useMemo } from 'react'
import {
  buildSparklinePoints,
  pointsToPolylineAttr,
  type PriceTrend,
} from '../../utils/priceMovementMath'

import './price-movement.css'

type Props = {
  values: number[]
  width?: number
  height?: number
  trend: PriceTrend
  className?: string
}

function strokeForTrend(t: PriceTrend): string {
  if (t === 'up') return 'rgb(52 211 153)'
  if (t === 'down') return 'rgb(251 113 133)'
  return 'rgb(148 163 184)'
}

export function MiniSparkline({
  values,
  width = 56,
  height = 22,
  trend,
  className = '',
}: Props) {
  const pointsAttr = useMemo(() => {
    if (values.length === 0) return ''
    return pointsToPolylineAttr(buildSparklinePoints(values, width, height, 2))
  }, [values, width, height])

  if (values.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={`shrink-0 opacity-40 ${className}`}
        aria-hidden
      />
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden
    >
      <polyline
        fill="none"
        strokeWidth={1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="price-sparkline-polyline"
        stroke={strokeForTrend(trend)}
        points={pointsAttr}
      />
    </svg>
  )
}
