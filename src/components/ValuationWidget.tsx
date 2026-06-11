import type { ReactNode } from 'react'
import { useFormat } from '../providers/FormatProvider'
import type { SpreadInsight } from '../utils/goldPrice'
import type { FormatCurrency } from '../utils/formatPrice'
import { spreadInsightLabelVi, spreadInsightShortLabelVi } from '../utils/goldPrice'

function fmtSignedPct(p: number): string {
  if (!Number.isFinite(p)) return '—'
  const sign = p > 0 ? '+' : ''
  return `${sign}${p.toFixed(1)}%`
}

function insightHeadlineVi(insight: SpreadInsight): string {
  switch (insight) {
    case 'premium':
      return 'VN cao hơn TG'
    case 'discount':
      return 'VN thấp hơn TG'
    default:
      return 'Sát giá TG'
  }
}

const CURRENCIES: readonly { id: FormatCurrency; label: string }[] = [
  { id: 'VND', label: 'VND' },
  { id: 'USD', label: 'USD' },
]

function MetalCurrencySeg() {
  const { currency, setCurrency } = useFormat()
  return (
    <div
      className="inline-flex shrink-0 rounded-lg border border-white/10 bg-slate-900/80 p-0.5"
      role="group"
      aria-label="Tiền tệ hiển thị"
    >
      {CURRENCIES.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setCurrency(o.id)}
          className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
            currency === o.id
              ? 'bg-white/10 text-white'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Thanh so sánh tương đối VN vs TG (cùng đơn vị). TG xám trung tính, VN accent tab. */
function SpreadRelBar({
  vnNumeric,
  worldNumeric,
  vnLabel,
  worldLabel,
}: {
  vnNumeric: number
  worldNumeric: number
  vnLabel: string
  worldLabel: string
}) {
  const sum = vnNumeric + worldNumeric
  const vnShare = sum > 0 ? Math.min(100, Math.max(0, (vnNumeric / sum) * 100)) : 50
  const tgShare = 100 - vnShare
  return (
    <div className="app-vstack-xs">
      <div
        className="flex h-1.5 w-full overflow-hidden rounded-full"
        title={`${worldLabel} · ${vnLabel}`}
      >
        <div
          className="h-full bg-bx-neutral transition-[width] duration-500 ease-out"
          style={{ width: `${tgShare}%` }}
        />
        <div
          className="h-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${vnShare}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px]">
        <span className="text-bx-muted">
          <span className="inline-block size-1.5 rounded-full bg-bx-neutral align-middle" /> TG
        </span>
        <span className="text-accent">
          VN <span className="inline-block size-1.5 rounded-full bg-accent align-middle" />
        </span>
      </div>
    </div>
  )
}

export type ValuationComparisonVN = {
  buy?: number | null
  sell?: number | null
  mid?: number | null
  caption: string
}

export type ValuationComparisonWorld = {
  buy?: number | null
  sell: number | null
  mid?: number | null
  caption: string
}

export type ValuationWidgetProps = {
  asset: 'gold' | 'silver'
  title: string
  sourceLine: string | null
  unitLine?: string | null
  updatedAt?: string | null
  vn: ValuationComparisonVN | null
  world: ValuationComparisonWorld | null
  spreadVnd?: number | null
  spreadPercent?: number | null
  insight: SpreadInsight
  format: (n: number) => string
  formatSigned: (n: number) => string
  loading?: boolean
  alert?: ReactNode
  footer?: ReactNode
  onRefresh?: () => void
  showFullComparison?: boolean
  showSpreadBar?: boolean
}

const cardClass =
  'rounded-lg border border-white/5 bg-gray-800/50 p-4 shadow-sm ring-1 ring-black/20'

export function ValuationWidget({
  title,
  sourceLine,
  unitLine,
  updatedAt,
  vn,
  world,
  spreadVnd,
  spreadPercent,
  insight,
  format,
  formatSigned,
  loading,
  alert,
  footer,
  onRefresh,
  showFullComparison = true,
  showSpreadBar = true,
}: ValuationWidgetProps) {
  /* Accent theo tab (data-accent trên shell) — gold ở tab Vàng, silver ở tab Bạc */
  const spreadAccent = 'text-accent'
  const titleAccent = 'text-accent'

  const hasSpread =
    spreadVnd != null &&
    spreadPercent != null &&
    Number.isFinite(spreadVnd) &&
    Number.isFinite(spreadPercent)

  const barFillClass =
    insight === 'premium'
      ? 'bg-gradient-to-r from-emerald-500/30 to-rose-500'
      : insight === 'discount'
        ? 'bg-gradient-to-r from-rose-500/30 to-emerald-500'
        : 'bg-gradient-to-r from-slate-600 to-slate-500'

  const vnSell = vn?.sell
  const worldSell = world?.sell
  const canRelBar =
    showSpreadBar &&
    vnSell != null &&
    worldSell != null &&
    vnSell > 0 &&
    worldSell > 0

  const subtitleParts = [sourceLine, updatedAt ? `Cập nhật: ${updatedAt}` : null].filter(
    Boolean,
  ) as string[]

  const showWorldCard = world != null && world.sell != null
  const vnHasBidAsk =
    showFullComparison && vn != null && vn.buy != null && vn.sell != null
  const vnHasMidOnly = vn != null && vn.mid != null && !vnHasBidAsk

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className={`text-lg font-semibold tracking-tight ${titleAccent}`}>{title}</h2>
          {subtitleParts.length > 0 ? (
            <p className="mt-0.5 truncate text-sm text-slate-400">{subtitleParts.join(' · ')}</p>
          ) : null}
          {unitLine ? (
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 max-[320px]:line-clamp-2">
              {unitLine}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <MetalCurrencySeg />
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="app-no-drag rounded-lg border border-slate-600/80 bg-slate-900/60 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
            >
              Làm mới
            </button>
          ) : null}
        </div>
      </div>

      {alert}

      {showWorldCard ? (
        <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
          <div className={cardClass}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-base" aria-hidden>
                🇻🇳
              </span>
              <span className="text-[11px] font-semibold text-bx-primary">Việt Nam</span>
            </div>
            <div className="space-y-2">
              {loading && !vn ? (
                <p className="text-[11px] text-slate-500">Đang tải…</p>
              ) : vnHasBidAsk ? (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] text-slate-500">Mua</span>
                    <span className="text-[14px] font-bold tabular-nums text-profit">{format(vn!.buy!)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] text-slate-500">Bán</span>
                    <span className="text-[14px] font-bold tabular-nums text-loss">{format(vn!.sell!)}</span>
                  </div>
                </>
              ) : vnHasMidOnly ? (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-slate-500">Giữa</span>
                  <span className="text-[14px] font-bold tabular-nums text-bx-primary">{format(vn!.mid!)}</span>
                </div>
              ) : vn?.sell != null ? (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-slate-500">Bán</span>
                  <span className="text-[14px] font-bold tabular-nums text-loss">{format(vn.sell)}</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">Chưa có dữ liệu VN</p>
              )}
            </div>
          </div>

          <div className={cardClass}>
            <div className="mb-3 flex min-w-0 items-center gap-2">
              <span className="text-base shrink-0" aria-hidden>
                🌍
              </span>
              <span className="truncate text-[11px] font-semibold text-bx-primary">{world.caption}</span>
            </div>
            <div className="space-y-2">
              {world.buy != null ? (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-slate-500">Mua qđ</span>
                  <span className="text-[13px] font-bold tabular-nums text-bx-primary">{format(world.buy)}</span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-slate-500">Bán qđ</span>
                <span className="text-[13px] font-bold tabular-nums text-bx-primary">{format(world.sell!)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {hasSpread ? (
        <div className="rounded-lg border border-white/5 bg-gray-800/30 p-4 ring-1 ring-black/15">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Spread
            </span>
            <button
              type="button"
              className="app-no-drag rounded-md border border-white/10 bg-slate-900/50 px-2 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              title={spreadInsightLabelVi(insight)}
            >
              {spreadInsightShortLabelVi(insight)}
            </button>
          </div>
          <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className={`text-xl font-bold tabular-nums ${spreadAccent}`}>
              {formatSigned(spreadVnd!)} ({fmtSignedPct(spreadPercent!)})
            </span>
            <span className="text-[11px] font-medium text-bx-secondary">
              {insightHeadlineVi(insight)}
            </span>
          </div>

          {canRelBar ? (
            <SpreadRelBar
              vnNumeric={vnSell!}
              worldNumeric={worldSell!}
              vnLabel={vn?.caption ?? 'VN'}
              worldLabel={world?.caption ?? 'TG'}
            />
          ) : (
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${barFillClass}`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(12, 50 + Math.min(45, Math.max(-45, (spreadPercent ?? 0) * 2.2))),
                  )}%`,
                }}
                title={spreadInsightLabelVi(insight)}
              />
            </div>
          )}
        </div>
      ) : loading && !showWorldCard ? (
        <p className="text-sm text-slate-500">Đang tải…</p>
      ) : null}

      {footer ? <div className="text-xs text-slate-500">{footer}</div> : null}
    </div>
  )
}
