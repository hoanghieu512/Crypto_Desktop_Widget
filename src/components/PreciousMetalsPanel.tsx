import { VN_GOLD_ROWS, useVnMetalPrices } from '../hooks/useVnMetalPrices'
import { useFormatPrice } from '../hooks/useFormatPrice'
import {
  GOLD_BUY_SELL_GAP_LABEL,
  GOLD_BUY_SELL_GAP_TOOLTIP,
  goldBidAskGridClass,
  goldQuotePanelClass,
} from '../utils/goldDisplay'
import { AssetCard } from './AssetCard'
import { GoldDashboard } from './GoldDashboard'

function changeClass(delta: number): string {
  if (delta > 0) return 'text-emerald-400'
  if (delta < 0) return 'text-rose-400'
  return 'text-slate-500'
}

type Props = {
  active: boolean
}

export function PreciousMetalsPanel({ active }: Props) {
  const {
    goldByCode,
    loading,
    error,
    goldFetchWarning,
    updatedAt,
    refresh,
  } = useVnMetalPrices(active)

  const { format: fmtLevel, unitHint } = useFormatPrice('gold')

  return (
    <div className="app-no-drag flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-4 pt-1 max-[299px]:gap-1.5 max-[299px]:px-2 min-[361px]:gap-3 min-[361px]:px-4">
      <div className="shrink-0">
        <GoldDashboard active={active} />
      </div>

      <div className="hidden min-[420px]:flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 min-[361px]:text-xs">
          <span className="min-w-0 max-[299px]:truncate">
            <span className="hidden min-[361px]:inline">Bảng chi tiết: </span>
            <a
              className="text-violet-400 underline-offset-2 hover:underline"
              href="https://www.vang.today"
              target="_blank"
              rel="noreferrer"
            >
              vang.today
            </a>
            <span className="hidden min-[361px]:inline"> · làm mới ~60s</span>
          </span>
          <button
            type="button"
            title="Làm mới bảng giá"
            onClick={() => void refresh()}
            className="app-no-drag shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 hover:border-violet-500/50 min-[361px]:text-xs"
          >
            <span className="min-[361px]:hidden">Làm mới</span>
            <span className="hidden min-[361px]:inline">Làm mới bảng</span>
          </button>
        </div>

        {updatedAt ? (
          <p className="shrink-0 text-xs text-slate-500">Cập nhật bảng giá: {updatedAt}</p>
        ) : null}

        {goldFetchWarning ? (
          <p
            className="shrink-0 rounded-lg border border-amber-500/35 bg-amber-950/35 px-3 py-2 text-xs leading-snug text-amber-100/90"
            role="status"
          >
            {goldFetchWarning}
          </p>
        ) : null}

        {error ? (
          <p className="shrink-0 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {loading && Object.keys(goldByCode).length === 0 ? (
          <p className="shrink-0 text-sm text-slate-400">Đang tải giá vàng…</p>
        ) : null}

        <section className="min-h-0 pb-1">
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 min-[361px]:text-xs">
            Vàng trong nước (SJC / DOJI / BTMC)
          </h2>
          <p className="mb-2 text-[10px] text-slate-500">{unitHint}</p>
          <ul className="flex flex-col gap-2">
            {VN_GOLD_ROWS.map((row) => {
              const q = goldByCode[row.code]
              const spread = q ? q.sell - q.buy : null
              return (
                <li key={row.code}>
                  <AssetCard
                    dense
                    type="gold"
                    title={row.label}
                    badge={row.code}
                    meta={q?.name}
                    hidePrice
                    price=""
                  >
                    {q ? (
                      <div className={`${goldQuotePanelClass} space-y-2`}>
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                          Niêm yết
                        </p>
                        <div className={goldBidAskGridClass}>
                          <span className="self-start pt-0.5 text-left text-slate-500">Mua</span>
                          <div className="flex flex-col items-end gap-0.5 text-right leading-tight">
                            <span className="text-emerald-400">{fmtLevel(q.buy)}</span>
                            <span
                              className={`text-[10px] tabular-nums ${changeClass(q.changeBuy)}`}
                              title="Δ mua"
                            >
                              Δ {fmtLevel(q.changeBuy)}
                            </span>
                          </div>
                          <span className="self-start pt-0.5 text-left text-slate-500">Bán</span>
                          <div className="flex flex-col items-end gap-0.5 text-right leading-tight">
                            <span className="text-base font-semibold text-rose-400">
                              {fmtLevel(q.sell)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold tabular-nums ${changeClass(q.changeSell)}`}
                              title="Δ bán"
                            >
                              Δ {fmtLevel(q.changeSell)}
                            </span>
                          </div>
                          <span className="text-slate-500" title={GOLD_BUY_SELL_GAP_TOOLTIP}>
                            {GOLD_BUY_SELL_GAP_LABEL}
                          </span>
                          <span className="text-right text-slate-300">
                            {spread != null ? fmtLevel(spread) : '—'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Chưa có dữ liệu mã {row.code}</p>
                    )}
                  </AssetCard>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
