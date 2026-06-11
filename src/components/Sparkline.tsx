import { memo, useId, useMemo } from 'react'

export type SparklineProps = {
  data: number[]
  className?: string
  width?: number
  height?: number
}

/**
 * SVG sparkline: auto-scales to min/max of finite samples.
 * Stroke green if last > first, red if last < first, slate if flat or insufficient data.
 * Gradient fill mờ dưới line theo hướng giá (Phase 2) — tan dần xuống trong suốt;
 * flat/thiếu data thì không fill. Gradient id qua useId — không đụng độ khi list dài.
 */
export const Sparkline = memo(function Sparkline({
  data,
  className = '',
  width = 100,
  height = 28,
}: SparklineProps) {
  const gradientId = useId()

  const { points, areaPath, stroke, trend } = useMemo(() => {
    const valid = data.filter((x) => Number.isFinite(x))
    if (valid.length < 2) {
      return { points: '', areaPath: '', stroke: 'rgb(148 163 184)', trend: 'flat' as const }
    }
    const min = Math.min(...valid)
    const max = Math.max(...valid)
    const range = max - min || 1
    const pad = 2
    const w = width - pad * 2
    const h = height - pad * 2
    const xy = valid.map((v, i) => {
      const x = pad + (i / (valid.length - 1)) * w
      const y = pad + h - ((v - min) / range) * h
      return [x, y] as const
    })
    const first = valid[0]!
    const last = valid[valid.length - 1]!
    let stroke = 'rgb(148 163 184)'
    let trend: 'up' | 'down' | 'flat' = 'flat'
    if (last > first) {
      stroke = 'rgb(52 211 153)'
      trend = 'up'
    } else if (last < first) {
      stroke = 'rgb(244 63 94)'
      trend = 'down'
    }
    const points = xy.map(([x, y]) => `${x},${y}`).join(' ')
    const line = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
    const areaPath = `${line} L${xy[xy.length - 1]![0]},${height} L${xy[0]![0]},${height} Z`
    return { points, areaPath, stroke, trend }
  }, [data, width, height])

  if (!points) return null

  return (
    <svg
      width={width}
      height={height}
      className={`shrink-0 ${className}`.trim()}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {trend !== 'flat' ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={stroke} stopOpacity={trend === 'up' ? 0.28 : 0.25} />
              <stop offset="1" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
})
