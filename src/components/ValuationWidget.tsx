import type { ReactNode } from 'react'
import type { SpreadInsight } from '../utils/goldPrice'
import {
  spreadAccentClass,
  spreadInsightLabelVi,
  spreadInsightShortLabelVi,
} from '../utils/goldPrice'

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

/** Thanh so sánh tương đối VN vs TG (cùng đơn vị). */
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
        className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-white/5"
        title={`${worldLabel} · ${vnLabel}`}
      >
        <div
          className="h-full bg-sky-500/75 transition-[width] duration-500 ease-out"
          style={{ width: `${tgShare}%` }}
        />
        <div
          className="h-full bg-amber-400/85 transition-[width] duration-500 ease-out"
          style={{ width: `${vnShare}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-slate-500">
        <span>
          <span className="inline-block size-1.5 rounded-full bg-sky-500/75 align-middle" /> TG
        </span>
        <span>
          VN{' '}
          <span className="inline-block size-1.5 rounded-full bg-amber-400/85 align-middle" />
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
  /** Hiển thị ở tab */
  asset: 'gold' | 'silver'
  title: string
  /** Ví dụ: SJC, Phú Quý */
  sourceLine: string | null
  unitLine?: string | null
  updatedAt?: string | null
  primaryCaption: string
  primaryPrice: number | string
  /** % chênh vs TG (spread) */
  changeVsWorldPercent?: number | null
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
  /** Hiện đầy đủ mua/bán VN (mặc định từ md) */
  showFullComparison?: boolean
  /** Hiện thanh so sánh + insight dài */
  showSpreadBar?: boolean
}

const cardShell =
  'rounded-2xl border border-white/[0.07] bg-slate-900/90 shadow-sm ring-1 ring-black/20'

export function ValuationWidget({
  asset,
  title,
  sourceLine,
  unitLine,
  updatedAt,
  primaryCaption,
  primaryPrice,
  changeVsWorldPercent,
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
  const accent = spreadAccentClass(insight)
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

  const titleAccent = asset === 'gold' ? 'text-amber-200/95' : 'text-slate-200/95'

  const priceDisplay =
    typeof primaryPrice === 'number' && Number.isFinite(primaryPrice)
      ? format(primaryPrice)
      : primaryPrice

  return (
    <div className={`${cardShell} app-panel`}>
      <div className="flex min-w-0 items-start justify-between gap-2 border-b border-white/10 pb-2">
        <div className="min-w-0">
          <h2 className={`text-base font-semibold tracking-tight ${titleAccent} min-[361px]:text-lg`}>
            {title}
          </h2>
          {sourceLine ? (
            <p className="mt-1 truncate text-label text-slate-500">{sourceLine}</p>
          ) : null}
          {unitLine ? (
            <p className="mt-1 text-meta text-slate-600 max-[299px]:hidden">{unitLine}</p>
          ) : null}
          {updatedAt ? (
            <p className="mt-1 text-meta text-slate-600 max-[299px]:hidden">
              Cập nhật: {updatedAt}
            </p>
          ) : null}
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="app-no-drag shrink-0 rounded-lg border border-slate-600/80 px-2 py-1 text-meta text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Làm mới
          </button>
        ) : null}
      </div>

      {alert}

      <div className="mt-3 app-vstack-sm">
        <p className="text-meta font-medium uppercase tracking-wide text-slate-500">{primaryCaption}</p>
        <p className="font-mono text-price font-semibold tabular-nums tracking-tight text-white max-[299px]:text-lg">
          {loading ? '…' : priceDisplay}
        </p>
        {changeVsWorldPercent != null && Number.isFinite(changeVsWorldPercent) ? (
          <p className={`text-label font-semibold tabular-nums transition-colors duration-300 ${accent}`}>
            {fmtSignedPct(changeVsWorldPercent)} <span className="font-normal text-slate-500">so với TG</span>
          </p>
        ) : null}
      </div>

      {world != null && world.sell != null ? (
        <div className="mt-3 app-vstack-lg border-t border-white/10 pt-3">
          <p className="text-meta font-medium uppercase tracking-wide text-slate-500">So sánh (lượng)</p>

          <div className="hidden min-[300px]:block app-vstack-md">
            {vn != null && showFullComparison && vn.buy != null && vn.sell != null ? (
              <>
                <div className="hidden min-[361px]:flex flex-col rounded-lg bg-slate-950/50 app-pad-md ring-1 ring-white/5 app-vstack-sm">
                  <p className="text-meta text-slate-500">{vn.caption}</p>
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-slate-500">Mua</span>
                    <span className="tabular-nums text-emerald-400/90">{format(vn.buy)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-slate-500">Bán</span>
                    <span className="tabular-nums font-semibold text-rose-300/90">{format(vn.sell)}</span>
                  </div>
                </div>
                <div className="flex min-[361px]:hidden justify-between gap-2 rounded-lg bg-slate-950/50 app-pad-md text-xs ring-1 ring-white/5">
                  <span className="text-slate-500">VN · bán</span>
                  <span className="tabular-nums font-medium text-rose-300/90">{format(vn.sell)}</span>
                </div>
              </>
            ) : null}
            {vn != null && vn.mid != null && !(vn.buy != null && vn.sell != null) ? (
              <div className="flex justify-between gap-2 rounded-lg bg-slate-950/50 app-pad-md text-xs ring-1 ring-white/5">
                <span className="text-slate-500">{vn.caption}</span>
                <span className="tabular-nums font-medium text-slate-200">{format(vn.mid)}</span>
              </div>
            ) : null}
            {vn != null && vn.sell != null && vn.buy == null && vn.mid == null ? (
              <div className="flex justify-between gap-2 rounded-lg bg-slate-950/50 app-pad-md text-xs ring-1 ring-white/5">
                <span className="text-slate-500">{vn.caption}</span>
                <span className="tabular-nums font-medium text-slate-200">{format(vn.sell)}</span>
              </div>
            ) : null}

            <div className="flex flex-col rounded-lg bg-slate-950/40 app-pad-md ring-1 ring-white/5 app-vstack-sm">
              <p className="text-meta text-slate-500">{world.caption}</p>
              {world.buy != null ? (
                <div className="flex justify-between gap-3 text-label">
                  <span className="text-slate-500">Mua quy đổi</span>
                  <span className="tabular-nums text-slate-400">{format(world.buy)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-slate-500">Bán quy đổi</span>
                <span className="tabular-nums font-medium text-sky-300/90">{format(world.sell)}</span>
              </div>
            </div>
          </div>

          <div className="min-[300px]:hidden app-vstack-md text-label text-slate-400">
            {vn?.sell != null ? (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">VN bán</span>
                <span className="tabular-nums text-slate-200">{format(vn.sell)}</span>
              </div>
            ) : vn?.mid != null ? (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">VN</span>
                <span className="tabular-nums text-slate-200">{format(vn.mid)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">TG bán</span>
              <span className="tabular-nums text-sky-300/80">{format(world.sell)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {hasSpread ? (
        <div className="mt-3 app-vstack-md border-t border-white/10 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-meta font-semibold uppercase tracking-wide text-slate-500">Spread</p>
            <span
              className={`rounded-full px-2 py-0.5 text-meta font-semibold tabular-nums ring-1 ring-inset ${
                insight === 'premium'
                  ? 'bg-rose-500/15 text-rose-300 ring-rose-500/25'
                  : insight === 'discount'
                    ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25'
                    : 'bg-slate-600/60 text-slate-300 ring-slate-500/30'
              }`}
              title={spreadInsightLabelVi(insight)}
            >
              {spreadInsightShortLabelVi(insight)}
            </span>
          </div>
          <p className={`text-price font-semibold tabular-nums ${accent}`}>
            {formatSigned(spreadVnd!)} ({fmtSignedPct(spreadPercent!)})
          </p>
          <p className={`text-label font-medium ${accent}`}>{insightHeadlineVi(insight)}</p>

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
      ) : null}

      {footer ? <div className="mt-3 text-meta text-slate-600">{footer}</div> : null}
    </div>
  )
}
