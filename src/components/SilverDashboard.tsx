import { useSilverPrice } from '../hooks/useSilverPrice'
import { useFormatPrice } from '../hooks/useFormatPrice'
import { SILVER_WORLD_HALF_SPREAD_USD_PER_OZ } from '../api/fetchSilverWorldWithFallback'
import {
  GOLD_BUY_SELL_GAP_LABEL,
  GOLD_BUY_SELL_GAP_TOOLTIP,
  metalBidAskTableGridClass,
} from '../utils/goldDisplay'
import { AssetCard } from './AssetCard'

function fmtSignedPct(p: number): string {
  const sign = p > 0 ? '+' : ''
  return `${sign}${p.toFixed(1)}%`
}

const TOOLTIP =
  'Spot bạc thế giới (USD/tr.oz) quy đổi VND/lượng như vàng. Mua/bán quốc tế ước lượng ± quanh mid. Spread: VN giữa − thế giới giữa.'

type Props = {
  active: boolean
}

export function SilverDashboard({ active }: Props) {
  const {
    worldBuyUsdPerOz,
    worldSellUsdPerOz,
    worldMidUsdPerOz,
    worldBuyVndPerLuong,
    worldSellVndPerLuong,
    worldMidVndPerLuong,
    vnBuyVndPerLuong,
    vnSellVndPerLuong,
    vnMidVndPerLuong,
    vnLabel,
    usdVnd,
    spread,
    spreadAccentClass: accentCls,
    spreadInsightLabel,
    loading,
    worldError,
    listingsError,
    fxError,
    worldWarning,
    listingsWarning,
    updatedAt,
    vnSilverMissing,
    refresh,
  } = useSilverPrice(active)

  const { format: fmtLevel, formatSigned: fmtSignedLevel, unitHint } = useFormatPrice('silver')

  const accent = accentCls
  const wm = worldMidVndPerLuong
  const vm = vnMidVndPerLuong
  const worldReady =
    wm != null &&
    worldBuyVndPerLuong != null &&
    worldSellVndPerLuong != null &&
    worldMidUsdPerOz != null
  const spreadReady = vm != null && wm != null && spread != null

  const blockingError = worldError

  const vnBidAskSpread =
    spreadReady && vnSellVndPerLuong != null && vnBuyVndPerLuong != null
      ? vnSellVndPerLuong - vnBuyVndPerLuong
      : null

  const refreshBtn = (
    <button
      type="button"
      onClick={() => void refresh()}
      className="app-no-drag rounded-md border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 transition-colors duration-200 hover:border-white/20 hover:text-slate-100"
    >
      Làm mới
    </button>
  )

  const mainLabel = spreadReady
    ? 'Giá giữa VN / lượng'
    : worldReady
      ? 'Giá giữa TG / lượng'
      : undefined
  const mainPrice =
    spreadReady && vnMidVndPerLuong != null
      ? vnMidVndPerLuong
      : worldReady && worldMidVndPerLuong != null
        ? worldMidVndPerLuong
        : loading
          ? '…'
          : '—'

  return (
    <div title={TOOLTIP}>
      <AssetCard
        type="silver"
        title="Bạc"
        badge="Dashboard"
        action={refreshBtn}
        meta={
          unitHint || updatedAt ? (
            <>
              {unitHint}
              {updatedAt ? (
                <>
                  {unitHint ? ' · ' : null}
                  Niêm yết VN: {updatedAt}
                </>
              ) : null}
            </>
          ) : undefined
        }
        priceLabel={mainLabel}
        price={mainPrice}
        priceClassName={spreadReady ? 'text-slate-50' : undefined}
        priceAside={
          spreadReady && spread ? (
            <span className={`font-mono text-sm font-semibold tabular-nums ${accent}`} title={spreadInsightLabel}>
              {fmtSignedLevel(spread.spreadVnd)} ({fmtSignedPct(spread.spreadPercent)})
            </span>
          ) : undefined
        }
      >
        {worldWarning ? (
          <p
            className="rounded-md border border-amber-500/35 bg-amber-950/40 px-2 py-1 text-[10px] leading-snug text-amber-100/90"
            role="status"
          >
            {worldWarning}
          </p>
        ) : null}
        {listingsWarning ? (
          <p
            className="rounded-md border border-amber-500/35 bg-amber-950/40 px-2 py-1 text-[10px] leading-snug text-amber-100/90"
            role="status"
          >
            {listingsWarning}
          </p>
        ) : null}

        {blockingError ? <p className="text-xs text-rose-300/90">{blockingError}</p> : null}
        {listingsError && !blockingError ? (
          <p className="text-[10px] text-rose-300/80">{listingsError}</p>
        ) : null}
        {fxError && !blockingError ? (
          <p className="text-[10px] text-amber-200/70">{fxError}</p>
        ) : null}

        {vnSilverMissing && !listingsError ? (
          <p className="rounded-md border border-slate-600/50 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-400">
            Bảng niêm yết chưa có dòng bạc VN. Khi API thêm mã, spread sẽ tự hiện. Giá thế giới vẫn dùng được.
          </p>
        ) : null}

        {loading && !worldReady ? <p className="text-xs text-slate-500">Đang tải…</p> : null}

        {worldReady ? (
          <>
            {worldMidUsdPerOz != null && usdVnd != null ? (
              <p className="text-xs text-slate-400">
                XAG: mua {worldBuyUsdPerOz?.toLocaleString('en-US', { maximumFractionDigits: 3 })} · bán{' '}
                {worldSellUsdPerOz?.toLocaleString('en-US', { maximumFractionDigits: 3 })} · giữa{' '}
                {worldMidUsdPerOz.toLocaleString('en-US', { maximumFractionDigits: 3 })} USD/oz · FX:{' '}
                {usdVnd.toLocaleString('vi-VN')}
                <span className="mt-0.5 block text-[10px] text-slate-600">
                  (±{SILVER_WORLD_HALF_SPREAD_USD_PER_OZ} USD/oz quanh mid.)
                </span>
              </p>
            ) : null}

            <div className="border-t border-white/10" />

            {spreadReady && vnBuyVndPerLuong != null && vnSellVndPerLuong != null ? (
              <div className={metalBidAskTableGridClass}>
                <div />
                <div className="text-slate-500">Mua</div>
                <div className="text-right text-slate-500">Bán</div>

                <div className="text-slate-400">TG</div>
                <div className="text-right text-slate-400">{fmtLevel(worldBuyVndPerLuong!)}</div>
                <div className="text-right text-slate-400">{fmtLevel(worldSellVndPerLuong!)}</div>

                <div className="text-slate-400">VN</div>
                <div className="text-right text-emerald-400">{fmtLevel(vnBuyVndPerLuong)}</div>
                <div className="text-right font-semibold text-rose-400">
                  {fmtLevel(vnSellVndPerLuong)}
                </div>

                <div className="pr-1 text-slate-500" title={GOLD_BUY_SELL_GAP_TOOLTIP}>
                  {GOLD_BUY_SELL_GAP_LABEL}
                </div>
                <div />
                <div className="text-right text-slate-300">
                  {vnBidAskSpread != null ? fmtLevel(vnBidAskSpread) : '—'}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Chưa có niêm yết VN để so sánh mua/bán.</p>
            )}

            <p className="text-xs text-slate-400">
              Giữa TG: {fmtLevel(worldMidVndPerLuong!)}
              {spreadReady && vm != null ? (
                <>
                  {' '}
                  · Giữa VN: {fmtLevel(vm)}
                </>
              ) : null}
            </p>

            {vnLabel ? <p className="text-xs text-slate-600">{vnLabel}</p> : null}
          </>
        ) : !loading && blockingError ? null : !loading && !worldReady && !blockingError ? (
          <p className="text-xs text-slate-500">Chưa đủ dữ liệu hiển thị.</p>
        ) : null}
      </AssetCard>
    </div>
  )
}
