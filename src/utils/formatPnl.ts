export function getPnlIntensityClass(pnlPercent: number | null | undefined): string {
  if (pnlPercent == null || !Number.isFinite(pnlPercent)) return 'text-bx-muted'
  const abs = Math.abs(pnlPercent)
  const profit = pnlPercent >= 0

  if (abs < 2) return profit ? 'text-green-500/60' : 'text-red-500/60'
  if (abs < 5) return profit ? 'text-green-500' : 'text-red-500'
  if (abs < 10) return profit ? 'text-green-400' : 'text-red-400'
  if (abs < 20) return profit ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'
  return profit ? 'text-green-300 font-bold' : 'text-red-300 font-bold'
}

