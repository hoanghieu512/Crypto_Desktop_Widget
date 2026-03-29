/** Step size scaled to mark (~0.02–0.05% of price), snapped to 1–2–5 × 10^n */
export function ladderStepForPrice(mid: number): number {
  if (!Number.isFinite(mid) || mid <= 0) return 1
  const target = mid * 0.00035
  const pow = 10 ** Math.floor(Math.log10(target))
  const n = target / pow
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  const step = m * pow
  return Math.max(step, mid * 1e-8)
}

/** High → low (chart-style), `count` odd, centered on grid-aligned mark */
export function buildLadderLevels(mid: number, step: number, count: number): number[] {
  if (!Number.isFinite(mid) || mid <= 0 || !Number.isFinite(step) || step <= 0) return []
  const half = Math.floor(count / 2)
  const center = Math.round(mid / step) * step
  const levels: number[] = []
  for (let k = half; k >= -half; k--) {
    levels.push(center + k * step)
  }
  return levels
}

export function toLadderInputString(price: number): string {
  if (!Number.isFinite(price)) return ''
  const abs = Math.abs(price)
  const maxFrac = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6
  return price.toFixed(maxFrac).replace(/\.?0+$/, '')
}

export function pctVsMark(level: number, mark: number): number {
  if (!Number.isFinite(level) || !Number.isFinite(mark) || mark === 0) return 0
  return ((level - mark) / mark) * 100
}

/** Single ladder row closest to live mark (avoids double-highlight between ticks) */
export function highlightLevelForMark(levels: readonly number[], mark: number): number | null {
  if (levels.length === 0 || !Number.isFinite(mark)) return null
  return levels.reduce((best, L) => (Math.abs(L - mark) < Math.abs(best - mark) ? L : best))
}
