export type PriceTrend = 'up' | 'down' | 'sideways'

const TREND_REL_EPS = 0.00012

/**
 * Xu hướng ngắn: so sánh điểm đầu vs cuối trong cửa sổ gần nhất.
 */
export function computeShortTrend(
  values: number[],
  windowSize = 5,
): PriceTrend {
  if (values.length < 2) return 'sideways'
  const slice = values.slice(-Math.min(windowSize, values.length))
  const first = slice[0]
  const last = slice[slice.length - 1]
  const ref = Math.max(Math.abs(first), 1e-12)
  const rel = (last - first) / ref
  if (rel > TREND_REL_EPS) return 'up'
  if (rel < -TREND_REL_EPS) return 'down'
  return 'sideways'
}

/** Xu hướng toàn bộ chuỗi hiển thị (cho màu sparkline) */
export function computeSeriesTrend(values: number[]): PriceTrend {
  if (values.length < 2) return 'sideways'
  const first = values[0]
  const last = values[values.length - 1]
  const ref = Math.max(Math.abs(first), 1e-12)
  const rel = (last - first) / ref
  if (rel > TREND_REL_EPS) return 'up'
  if (rel < -TREND_REL_EPS) return 'down'
  return 'sideways'
}

/** Độ biến động tương đối: σ / |μ| × 100 (%) */
export function coefficientOfVariationPercent(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, x) => s + x, 0) / values.length
  if (!Number.isFinite(mean) || mean === 0) return 0
  const variance =
    values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length - 1)
  const sd = Math.sqrt(Math.max(variance, 0))
  return (sd / Math.abs(mean)) * 100
}

export type VolatilityLevel = 'low' | 'medium' | 'high'

export function volatilityLevelFromCv(cvPct: number): VolatilityLevel {
  if (cvPct < 0.035) return 'low'
  if (cvPct < 0.14) return 'medium'
  return 'high'
}

export type SparklinePoint = { x: number; y: number }

/** Điểm polyline trong viewBox — y đảo (SVG), auto-scale min/max */
export function buildSparklinePoints(
  values: number[],
  width: number,
  height: number,
  pad = 2,
): SparklinePoint[] {
  if (values.length === 0) return []
  const n = values.length
  if (n === 1) {
    const y = height / 2
    return [
      { x: pad, y },
      { x: width - pad, y },
    ]
  }
  let min = values[0]
  let max = values[0]
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = max - min || Math.max(Math.abs(max), 1) * 1e-6
  const innerH = height - pad * 2
  const innerW = width - pad * 2
  return values.map((v, i) => {
    const x = pad + (innerW * i) / (n - 1)
    const t = (v - min) / span
    const y = pad + innerH * (1 - t)
    return { x, y }
  })
}

export function pointsToPolylineAttr(points: SparklinePoint[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}
