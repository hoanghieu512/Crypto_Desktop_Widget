import { memo, useMemo } from 'react'

export type SparklineProps = {
  data: number[]
  className?: string
  width?: number
  height?: number
}

/**
 * SVG sparkline: auto-scales to min/max of finite samples.
 * Stroke green if last > first, red if last < first, slate if flat or insufficient data.
 */
export const Sparkline = memo(function Sparkline({
  data,
  className = '',
  width = 100,
  height = 28,
}: SparklineProps) {
  const { points, stroke } = useMemo(() => {
    const valid = data.filter((x) => Number.isFinite(x))
    if (valid.length < 2) {
      return { points: '', stroke: 'rgb(148 163 184)' }
    }
    const min = Math.min(...valid)
    const max = Math.max(...valid)
    const range = max - min || 1
    const pad = 2
    const w = width - pad * 2
    const h = height - pad * 2
    const pts = valid.map((v, i) => {
      const x = pad + (i / (valid.length - 1)) * w
      const y = pad + h - ((v - min) / range) * h
      return `${x},${y}`
    })
    const first = valid[0]!
    const last = valid[valid.length - 1]!
    let stroke = 'rgb(148 163 184)'
    if (last > first) stroke = 'rgb(52 211 153)'
    else if (last < first) stroke = 'rgb(244 63 94)'
    return { points: pts.join(' '), stroke }
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
