import { useGoldPrice } from '../hooks/useGoldPrice'
import { useFormatPrice } from '../hooks/useFormatPrice'
import type { SpreadInsight } from '../utils/goldPrice'
import { StaleBanner } from './StaleBanner'
import { ValuationWidget } from './ValuationWidget'

const PAGE_TOOLTIP =
  'Thế giới: XAU/USD mua/bán × USD/VND × (37.5g ÷ 31.1035g). So sánh giá bán VN và giá bán thế giới quy đổi / lượng.'

type Props = {
  active: boolean
}

export function GoldDashboard({ active }: Props) {
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
    error,
    fxError,
    goldFetchWarning,
    updatedAt,
    vnSjcMissing,
    isStale,
    staleBanner,
    refresh,
  } = useGoldPrice(active)

  const { format: fmtLevel, formatSigned: fmtSignedLevel, unitHint } = useFormatPrice('gold')

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
          className="rounded-lg border border-amber-500/35 bg-amber-950/35 app-pad-md text-[11px] leading-snug text-amber-100/95"
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
          className="rounded-lg border border-amber-500/35 bg-amber-950/40 app-pad-md text-[10px] leading-snug text-amber-100/90"
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
      <div className="rounded-xl border border-white/[0.07] bg-slate-900/70 p-4 ring-1 ring-black/20">
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
        alert={hasAlert ? alert : null}
        footer={
          ready && vnLabel ? (
            <span className="text-slate-500">
              {vnLabel}
              {vnSource === 'mock' ? <span className="text-amber-500/80"> · mock</span> : null}
            </span>
          ) : null
        }
        onRefresh={() => void refresh()}
      />
      </div>
    </div>
  )
}
