import { memo, type ReactNode } from 'react'

export type BadgeVariant = 'crypto' | 'gold' | 'silver'

const variantPalette: Record<BadgeVariant, string> = {
  crypto: 'bg-blue-500/15 text-blue-100 ring-blue-500/35',
  gold: 'bg-amber-500/15 text-amber-100 ring-amber-500/35',
  silver: 'bg-slate-500/15 text-slate-200 ring-slate-500/35',
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
