import type { VolatilityLevel } from '../../utils/priceMovementMath'

type Props = {
  level: VolatilityLevel
  cvPercent: number
  className?: string
}

function labelVi(level: VolatilityLevel): string {
  switch (level) {
    case 'high':
      return '🔥 Biến động cao'
    case 'medium':
      return '⚠️ Trung bình'
    default:
      return '🟢 Thấp'
  }
}

export function VolatilityBadge({ level, cvPercent, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] text-slate-400 ${className}`}
      title={`Độ lệch tương đối (CV): ${cvPercent.toFixed(3)}%`}
    >
      <span>{labelVi(level)}</span>
      <span className="font-mono text-slate-600">({cvPercent.toFixed(2)}%)</span>
    </span>
  )
}
