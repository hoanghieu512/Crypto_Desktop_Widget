import { memo, type ReactNode } from 'react'

export type BadgeVariant = 'crypto' | 'gold' | 'silver'

/* gold/silver: tông accent tab nhạt (Phase 3) — render trong shell data-accent nên
   text-accent/bg-accent tự ra đúng màu kim loại của tab */
const variantPalette: Record<BadgeVariant, string> = {
  crypto: 'bg-blue-500/15 text-blue-100 ring-blue-500/35',
  gold: 'bg-accent/[0.14] text-accent ring-accent/30',
  silver: 'bg-accent/[0.12] text-accent ring-accent/30',
}

const base =
  'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 transition-colors duration-200'

export type BadgeProps = {
  variant: BadgeVariant
  children: ReactNode
  /** Thay palette mặc định (vd. Spot / Futures trên dòng crypto) */
  className?: string
}

export const Badge = memo(function Badge({ variant, children, className }: BadgeProps) {
  const palette = className?.trim() ? className : variantPalette[variant]
  return <span className={`${base} ${palette}`.trim()}>{children}</span>
})
