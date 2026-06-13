import { useEffect } from 'react'
import { useGoldPrice } from '../hooks/useGoldPrice'
import { useFormatPrice } from '../hooks/useFormatPrice'
import type { SpreadInsight } from '../utils/goldPrice'
import { StaleBanner } from './StaleBanner'
import { ValuationWidget } from './ValuationWidget'
import { MetalValuationSkeleton } from './CardSkeleton'
import { ErrorState } from './ErrorState'
import { ViErrors } from '../utils/friendlyErrors'

const PAGE_TOOLTIP =
  'Thế giới: XAU/USD mua/bán × USD/VND × (37.5g ÷ 31.1035g). So sánh giá bán VN và giá bán thế giới quy đổi / lượng.'

type Props = {
  active: boolean
  /** Refresh gộp (v1.8.5): nút Làm mới của card cũng refresh bảng chi tiết */
  extraRefresh?: () => void
  extraRefreshing?: boolean
}

export function GoldDashboard({ active, extraRefresh, extraRefreshing = false }: Props) {
  const {
    worldBuyUsdPerOz,
    worldSellUsdPerOz,
    worldBuyVndPerLuong,
    worldSellVndPerLuong,
    vnBuyVndPerLuong,
    vnSellVndPerLuong,
    vnLabel,
    vnSource,
    spread,
    insight,
    loading,
    isRefreshing,
    error,
    fxError,
    goldFetchWarning,
    updatedAt,
    vnSjcMissing,
    isStale,
    staleBanner,
    refresh,
    retry,
  } = useGoldPrice(active)

  const { format: fmtLevel, formatSigned: fmtSignedLevel, unitHint } = useFormatPrice('gold')

  /** Phím R (app:refresh) giờ refresh cả card định giá — trước v1.8.5 chỉ refresh bảng */
  useEffect(() => {
    if (!active) return
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ tab?: string }>
      if (ce.detail?.tab && ce.detail.tab !== 'gold') return
      void refresh()
    }
    window.addEventListener('app:refresh', on as EventListener)
    return () => window.removeEventListener('app:refresh', on as EventListener)
  }, [active, refresh])

  const sp = spread
  const worldOk =
    worldBuyVndPerLuong != null &&
    worldSellVndPerLuong != null &&
    worldBuyUsdPerOz != null &&
    worldSellUsdPerOz != null
  const vnOk =
    !vnSjcMissing &&
    vnBuyVndPerLuong != null &&
    vnSellVndPerLuong != null
  const ready = worldOk && vnOk && sp != null

  const insightVal: SpreadInsight = ready ? insight : 'neutral'

  const sourceLine = (() => {
    if (!worldOk) return loading ? null : null
    if (ready) {
      const base = vnLabel ?? 'Niêm yết SJC'
      return vnSource === 'mock' ? `${base} · mock` : base
    }
    if (vnSjcMissing) return 'Chưa có mã SJC (SJL1L10 / VNGSJC) trong bảng'
    return null
  })()

  const alert = (
    <div className="mt-2 space-y-2">
      {vnSjcMissing && worldOk ? (
        <p
          className="rounded-lg border border-amber-400/30 bg-amber-400/[0.07] app-pad-md text-[11px] leading-snug text-amber-200/90"
          role="status"
        >
          Không có dữ liệu SJC — chỉ hiển thị giá thế giới quy đổi.
        </p>
      ) : null}
      {loading && !ready && !vnSjcMissing ? (
        <p className="text-xs text-slate-500">Đang tải…</p>
      ) : null}
      {goldFetchWarning ? (
        <p
          className="rounded-lg border border-amber-400/30 bg-amber-400/[0.07] app-pad-md text-[10px] leading-snug text-amber-200/90"
          role="status"
        >
          {goldFetchWarning}
        </p>
      ) : null}
      {error ? <p className="text-xs text-rose-300/90">{error}</p> : null}
      {fxError && !error ? <p className="text-[10px] text-amber-200/70">{fxError}</p> : null}
      {!loading && !error && !worldOk ? (
        <p className="text-xs text-slate-500">Chưa đủ dữ liệu.</p>
      ) : null}
    </div>
  )

  const hasAlert =
    (vnSjcMissing && worldOk) ||
    (loading && !ready && !vnSjcMissing) ||
    Boolean(goldFetchWarning) ||
    Boolean(error) ||
    Boolean(fxError && !error) ||
    (!loading && !error && !worldOk)

  return (
    <div title={PAGE_TOOLTIP} className="flex flex-col gap-3">
      <StaleBanner
        {...staleBanner}
        onManualRefresh={
          isStale
            ? () => {
                void refresh()
              }
            : undefined
        }
      />
      <div className="relative rounded-xl border border-white/[0.07] bg-slate-900/70 p-4 ring-1 ring-black/20">
        {error && worldOk ? (
          <div className="mb-3">
            <ErrorState
              compact
              title={ViErrors.apiTitle}
              message="Đang hiển thị bản đã tải trước đó (có thể đã cũ). Nhấn Thử lại để tải mới."
              onRetry={() => void retry()}
            />
          </div>
        ) : null}
        {loading && !worldOk ? (
          <MetalValuationSkeleton />
        ) : error && !worldOk && !loading ? (
          <ErrorState
            title={ViErrors.networkTitle}
            message={ViErrors.networkMessage}
            onRetry={() => void retry()}
          />
        ) : (
          <ValuationWidget
            asset="gold"
            title="Vàng"
            sourceLine={sourceLine}
            unitLine={unitHint ?? null}
            updatedAt={updatedAt}
            vn={
              ready
                ? {
                    buy: vnBuyVndPerLuong!,
                    sell: vnSellVndPerLuong!,
                    caption: 'Việt Nam',
                  }
                : null
            }
            world={
              worldOk
                ? {
                    buy: worldBuyVndPerLuong,
                    sell: worldSellVndPerLuong!,
                    caption: 'Thế giới (XAU)',
                  }
                : null
            }
            spreadVnd={ready && sp ? sp.spreadVnd : null}
            spreadPercent={ready && sp ? sp.spreadPercent : null}
            insight={insightVal}
            format={fmtLevel}
            formatSigned={fmtSignedLevel}
            loading={Boolean(loading && !ready && !worldOk)}
            refreshing={isRefreshing || extraRefreshing}
            alert={hasAlert ? alert : null}
            footer={
              ready && vnLabel ? (
                <span className="text-slate-500">
                  {vnLabel}
                  {vnSource === 'mock' ? <span className="text-amber-500/80"> · mock</span> : null}
                </span>
              ) : null
            }
            onRefresh={() => {
              void refresh()
              extraRefresh?.()
            }}
          />
        )}
        {isRefreshing && !(loading && !worldOk) ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl bg-slate-950/40 backdrop-blur-[0.5px]"
            aria-busy="true"
            aria-label="Đang làm mới"
          >
            <div className="absolute left-1/2 top-6 h-2 w-36 -translate-x-1/2 rounded-full bg-bx-elevated skeleton-shimmer" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
