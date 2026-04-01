import type { UseSilverPriceResult } from '../hooks/useSilverPrice'
import { useFormatPrice } from '../hooks/useFormatPrice'
import type { SpreadInsight } from '../utils/goldPrice'
import { ValuationWidget } from './ValuationWidget'
import { MetalValuationSkeleton } from './CardSkeleton'
import { ErrorState } from './ErrorState'
import { ViErrors } from '../utils/friendlyErrors'

const PAGE_TOOLTIP =
  'Spot bạc thế giới (USD/tr.oz) quy đổi VND/lượng như vàng. Spread: giữa VN − giữa TG (quy đổi).'

type Props = {
  silver: UseSilverPriceResult
}

export function SilverDashboard({ silver }: Props) {
  const {
    worldBuyUsdPerOz,
    worldSellUsdPerOz,
    worldBuyVndPerLuong,
    worldSellVndPerLuong,
    worldMidVndPerLuong,
    vnBuyVndPerLuong,
    vnSellVndPerLuong,
    vnMidVndPerLuong,
    vnLabel,
    spread,
    insight,
    loading,
    isRefreshing,
    worldError,
    listingsError,
    fxError,
    worldWarning,
    listingsWarning,
    updatedAt,
    vnSilverMissing,
    listings,
    refresh,
    retry,
  } = silver

  const { format: fmtLevel, formatSigned: fmtSignedLevel, unitHint } = useFormatPrice('silver')

  const wm = worldMidVndPerLuong
  const vm = vnMidVndPerLuong

  const worldOk =
    worldBuyVndPerLuong != null &&
    worldSellVndPerLuong != null &&
    worldBuyUsdPerOz != null &&
    worldSellUsdPerOz != null

  const vnOk =
    !vnSilverMissing &&
    vnBuyVndPerLuong != null &&
    vnSellVndPerLuong != null &&
    vm != null

  const ready = worldOk && vnOk && spread != null

  const insightVal: SpreadInsight = ready ? insight : 'neutral'

  const sourceLine = (() => {
    if (!worldOk) return null
    if (ready) {
      return vnLabel ?? 'Niêm yết Phú Quý'
    }
    if (vnSilverMissing) return 'Chưa có niêm yết Phú Quý để so sánh'
    return null
  })()

  const blockingError = worldError

  const alert = (
    <div className="mt-2 space-y-2">
      {worldWarning ? (
        <p
          className="rounded-lg border border-amber-500/35 bg-amber-950/40 app-pad-md text-[10px] leading-snug text-amber-100/90"
          role="status"
        >
          {worldWarning}
        </p>
      ) : null}
      {listingsWarning ? (
        <p
          className="rounded-lg border border-amber-500/35 bg-amber-950/40 app-pad-md text-[10px] leading-snug text-amber-100/90"
          role="status"
        >
          {listingsWarning}
        </p>
      ) : null}
      {vnSilverMissing && worldOk ? (
        <p
          className="rounded-lg border border-amber-500/35 bg-amber-950/35 app-pad-md text-[11px] leading-snug text-amber-100/95"
          role="status"
        >
          Không có niêm yết VN — chỉ hiển thị giá thế giới quy đổi.
        </p>
      ) : null}
      {loading && !ready && !vnSilverMissing ? (
        <p className="text-xs text-slate-500">Đang tải…</p>
      ) : null}
      {blockingError ? <p className="text-xs text-rose-300/90">{blockingError}</p> : null}
      {listingsError && !blockingError ? (
        <p className="text-[10px] text-rose-300/80">{listingsError}</p>
      ) : null}
      {fxError && !blockingError ? <p className="text-[10px] text-amber-200/70">{fxError}</p> : null}
      {!loading && !blockingError && !worldOk ? (
        <p className="text-xs text-slate-500">Chưa đủ dữ liệu.</p>
      ) : null}
    </div>
  )

  const hasAlert =
    Boolean(worldWarning) ||
    Boolean(listingsWarning) ||
    (vnSilverMissing && worldOk) ||
    (loading && !ready && !vnSilverMissing) ||
    Boolean(blockingError) ||
    Boolean(listingsError && !blockingError) ||
    Boolean(fxError && !blockingError) ||
    (!loading && !blockingError && !worldOk)

  return (
    <div title={PAGE_TOOLTIP} className="flex flex-col gap-3">
      <div className="relative rounded-xl border border-white/[0.07] bg-slate-900/70 p-4 ring-1 ring-black/20">
        {blockingError && worldOk ? (
          <div className="mb-3">
            <ErrorState
              compact
              title={ViErrors.apiTitle}
              message="Đang hiển thị bản đã tải trước đó. Nhấn Thử lại để tải mới."
              onRetry={() => void retry()}
            />
          </div>
        ) : null}
        {listingsError && worldOk && !blockingError && !loading ? (
          <div className="mb-3">
            <ErrorState
              compact
              title={ViErrors.apiTitle}
              message="Không tải được niêm yết VN. Giá thế giới vẫn hiển thị."
              onRetry={() => void retry()}
            />
          </div>
        ) : null}
        {loading && !worldOk ? (
          <MetalValuationSkeleton />
        ) : blockingError && !worldOk && !loading ? (
          <ErrorState
            title={ViErrors.networkTitle}
            message={ViErrors.networkMessage}
            onRetry={() => void retry()}
          />
        ) : (
          <ValuationWidget
            asset="silver"
            title="Bạc"
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
                    mid: wm,
                    caption: 'Thế giới (XAG)',
                  }
                : null
            }
            spreadVnd={ready && spread ? spread.spreadVnd : null}
            spreadPercent={ready && spread ? spread.spreadPercent : null}
            insight={insightVal}
            format={fmtLevel}
            formatSigned={fmtSignedLevel}
            loading={Boolean(loading && !ready && !worldOk)}
            alert={hasAlert ? alert : null}
            footer={
              ready && vnLabel ? (
                <span className="text-slate-500">{vnLabel}</span>
              ) : null
            }
            onRefresh={() => void refresh()}
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

      {listings.length > 1 ? (
        <section className="hidden min-[420px]:flex flex-col gap-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 min-[361px]:text-xs">
            Niêm yết trong nước (chi tiết)
          </h2>
          <ul className="flex flex-col gap-2">
            {listings.map((row) => {
              const rowSpread = row.sell - row.buy
              return (
                <li
                  key={row.code}
                  className="rounded-xl border border-white/[0.07] bg-slate-900/60 app-pad-md ring-1 ring-black/20"
                >
                  <div className="flex min-w-0 items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-200">{row.brand}</p>
                      <p className="truncate text-[10px] text-slate-500">
                        {row.name} · {row.unit}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                      {row.code}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">Mua</span>
                    <span className="tabular-nums text-emerald-400/90">{fmtLevel(row.buy)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">Bán</span>
                    <span className="tabular-nums font-semibold text-rose-300/90">{fmtLevel(row.sell)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3 border-t border-white/5 pt-1 text-[10px] text-slate-500">
                    <span>Chênh mua/bán</span>
                    <span className="tabular-nums text-slate-400">{fmtLevel(rowSpread)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
