export function formatSize(size: number): string {
  if (!Number.isFinite(size)) return '—'
  const v = Math.abs(size)
  if (v >= 10000) {
    return size.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })
  }
  if (v >= 1) {
    return size.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (v >= 0.0001) {
    return size.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }
  return size.toExponential(2)
}

