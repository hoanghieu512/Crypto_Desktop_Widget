import { memo, useMemo, type ReactNode } from 'react'
import { useFormat } from '../providers/FormatProvider'
import { buildFormatOptions, formatPrice } from '../utils/formatPrice'
import { Badge, type BadgeVariant } from './Badge'
import { Sparkline } from './Sparkline'

export type AssetCardType = BadgeVariant

const cardShell =
  'rounded-2xl border border-white/5 bg-slate-900/80 shadow-sm transition-colors duration-200 hover:border-white/10'

const titleAccent: Record<AssetCardType, string> = {
  crypto: 'text-blue-100/95',
  gold: 'text-amber-200/90',
  silver: 'text-slate-200/90',
}

const defaultBadgeText: Record<AssetCardType, string> = {
  crypto: 'Crypto',
  gold: 'Gold',
  silver: 'Silver',
}

function formatChangePercent(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : n < 0 ? '' : ''
  const abs = Math.abs(n)
  const decimals = abs >= 10 ? 2 : abs >= 1 ? 2 : 4
  return `${sign}${n.toFixed(decimals)}%`
}

function changeColorClass(n: number): string {
  if (!Number.isFinite(n)) return 'text-slate-500'
  if (n > 0) return 'text-emerald-400'
  if (n < 0) return 'text-rose-400'
  return 'text-slate-400'
}

/** Label | value grid — shared by domestic rows */
export const assetPricePairGridClass =
  'grid grid-cols-[minmax(0,4.25rem)_1fr] gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums'

export type AssetCardProps = {
  title: string
  type: AssetCardType
  /** Numeric = formatted via global engine; string = shown as-is (e.g. "—", "…") */
  price: string | number
  /** Percentage change; colored green / red by sign */
  change?: number
  /** Prefix for change line, e.g. "24h" or "vs thế giới" */
  changeLabel?: string
  sparkline?: number[]
  children?: ReactNode
  /** Overrides default type badge text (e.g. Binance, Spot · Last) */
  badge?: string
  /** Override badge palette (e.g. sky/amber for spot vs futures) */
  badgeClassName?: string
  /** Header right: refresh, row actions */
  action?: ReactNode
  meta?: ReactNode
  /** Label above price — design: text-xs */
  priceLabel?: string
  /** Tailwind classes for main price line */
  priceClassName?: string
  /** Cùng hàng với giá, căn phải (vd. premium Vàng/Bạc) */
  priceAside?: ReactNode
  className?: string
  dense?: boolean
  /** Settings / empty cards with no primary price */
  hidePrice?: boolean
}

export const AssetCard = memo(function AssetCard({
  title,
  type,
  price,
  change,
  changeLabel,
  sparkline,
  children,
  badge,
  badgeClassName,
  action,
  meta,
  priceLabel,
  priceClassName,
  priceAside,
  className = '',
  dense = false,
  hidePrice = false,
}: AssetCardProps) {
  const { mode, currency, rate } = useFormat()
  const pad = dense ? 'p-2.5' : 'p-3'
  const badgeText = badge ?? defaultBadgeText[type]
  const showSparkline = Array.isArray(sparkline) && sparkline.length >= 2
  const showChange = change !== undefined && Number.isFinite(change)

  const priceText = useMemo(() => {
    if (hidePrice) return ''
    if (typeof price === 'string') return price
    if (!Number.isFinite(price)) return '—'
    return formatPrice(price, buildFormatOptions(type, mode, currency, rate))
  }, [hidePrice, price, type, mode, currency, rate])

  const priceSize = dense ? 'text-lg' : 'text-xl'

  const showPriceBlock = !hidePrice

  return (
    <div className={`${cardShell} ${pad} flex flex-col gap-2 ${className}`.trim()}>
      <div className="grid min-h-8 grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3
            className={`min-w-0 truncate font-mono text-sm font-semibold tracking-tight text-slate-50 ${titleAccent[type]}`}
          >
            {title}
          </h3>
          <Badge variant={type} className={badgeClassName}>
            {badgeText}
          </Badge>
        </div>
        {action ? <div className="flex shrink-0 justify-end [&_button]:transition-colors">{action}</div> : null}
      </div>

      {meta ? <div className="text-xs text-slate-500">{meta}</div> : null}

      {showPriceBlock ? (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              {priceLabel ? (
                <p className="mb-0.5 text-xs font-medium text-slate-500">{priceLabel}</p>
              ) : null}
              <div
                className={`font-mono font-semibold tracking-tight ${priceSize} ${
                  priceClassName ?? 'text-slate-50'
                }`}
              >
                {priceText}
              </div>
              {showChange && !priceAside ? (
                <p className={`mt-1 font-mono text-xs ${changeColorClass(change!)}`}>
                  {changeLabel ? `${changeLabel}: ` : null}
                  {formatChangePercent(change!)}
                </p>
              ) : null}
            </div>
            {priceAside ? <div className="max-w-[min(100%,14rem)] shrink-0 text-right">{priceAside}</div> : null}
          </div>

          {showSparkline ? (
            <div className="mt-2 flex items-end justify-end opacity-90">
              <Sparkline data={sparkline!} width={120} height={32} />
            </div>
          ) : null}
        </div>
      ) : null}

      {children ? (
        <div className="flex flex-col gap-2 border-t border-white/10 pt-3 text-sm">{children}</div>
      ) : null}
    </div>
  )
})

/** @deprecated Use AssetCardType */
export type AssetCardVariant = AssetCardType
