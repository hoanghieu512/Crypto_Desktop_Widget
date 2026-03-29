import { useGoldPrice } from '../hooks/useGoldPrice'
import { useFormatPrice } from '../hooks/useFormatPrice'
import {
  GOLD_BUY_SELL_GAP_LABEL,
  GOLD_BUY_SELL_GAP_TOOLTIP,
  metalBidAskTableGridClass,
} from '../utils/goldDisplay'
import { spreadAccentClass, spreadInsightLabelVi } from '../utils/goldPrice'
import { AssetCard } from './AssetCard'

function fmtSignedPct(p: number): string {
  const sign = p > 0 ? '+' : ''
  return `${sign}${p.toFixed(1)}%`
}

const PAGE_TOOLTIP =
  'Thế giới: XAU/USD mua/bán × USD/VND × (37.5g ÷ 31.1035g). So sánh dùng giá bán VN và giá bán thế giới quy đổi / lượng.'

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
    usdVnd,
    spread,
    insight,
    loading,
    error,
    fxError,
    goldFetchWarning,
    updatedAt,
    refresh,
  } = useGoldPrice(active)

  const { format: fmtLevel, formatSigned: fmtSignedLevel, unitHint } = useFormatPrice('gold')

  const accent = spreadAccentClass(insight)
  const sp = spread
  const ready =
    worldBuyVndPerLuong != null &&
    worldSellVndPerLuong != null &&
    vnBuyVndPerLuong != null &&
    vnSellVndPerLuong != null &&
    sp != null

  const vnBidAskSpread = ready ? vnSellVndPerLuong! - vnBuyVndPerLuong! : null

  const premiumEmoji =
    insight === 'premium' ? ' 🔴' : insight === 'discount' ? ' 🟢' : ''

  const refreshBtn = (
    <button
      type="button"
      onClick={() => void refresh()}
      className="app-no-drag rounded-md border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 transition-colors duration-200 hover:border-white/20 hover:text-slate-100"
    >
      Làm mới
    </button>
  )

  return (
    <div title={PAGE_TOOLTIP}>
      <AssetCard
        type="gold"
        title="Vàng"
        badge="Dashboard"
        action={refreshBtn}
        meta={
          unitHint || updatedAt ? (
            <>
              {unitHint}
              {updatedAt ? (
                <>
                  {unitHint ? ' · ' : null}
                  Cập nhật: {updatedAt}
                </>
              ) : null}
            </>
          ) : undefined
        }
        priceLabel={ready ? 'Bán VN / lượng' : undefined}
        price={ready ? vnSellVndPerLuong! : loading ? '…' : '—'}
        priceClassName="text-white"
        priceAside={
          ready ? (
            <span
              className={`font-mono text-sm font-semibold tabular-nums ${accent}`}
              title={spreadInsightLabelVi(insight)}
            >
              {fmtSignedLevel(sp.spreadVnd)} ({fmtSignedPct(sp.spreadPercent)})
              {premiumEmoji}
            </span>
          ) : undefined
        }
      >
        {loading && !ready ? <p className="text-xs text-slate-500">Đang tải…</p> : null}
        {goldFetchWarning ? (
          <p
            className="rounded-md border border-amber-500/35 bg-amber-950/40 px-2 py-1 text-[10px] leading-snug text-amber-100/90"
            role="status"
          >
            {goldFetchWarning}
          </p>
        ) : null}
        {error ? <p className="text-xs text-rose-300/90">{error}</p> : null}
        {fxError && !error ? (
          <p className="text-[10px] text-amber-200/70">{fxError}</p>
        ) : null}

        {ready ? (
          <>
            {worldBuyUsdPerOz != null && worldSellUsdPerOz != null && usdVnd != null ? (
              <p className="text-xs text-slate-400">
                XAU:{' '}
                {worldSellUsdPerOz.toLocaleString('en-US', { maximumFractionDigits: 0 })}$ · FX:{' '}
                {usdVnd.toLocaleString('vi-VN')}
              </p>
            ) : null}

            <div className="border-t border-white/10" />

            <div className={metalBidAskTableGridClass}>
              <div />
              <div className="text-right text-slate-500">Mua</div>
              <div className="text-right text-slate-500">Bán</div>

              <div className="text-slate-400">TG</div>
              <div className="text-right text-slate-400">{fmtLevel(worldBuyVndPerLuong!)}</div>
              <div className="text-right text-slate-400">{fmtLevel(worldSellVndPerLuong!)}</div>

              <div className="text-slate-400">VN</div>
              <div className="text-right text-emerald-400">{fmtLevel(vnBuyVndPerLuong!)}</div>
              <div className="text-right font-semibold text-rose-400">
                {fmtLevel(vnSellVndPerLuong!)}
              </div>

              <div className="pr-1 text-slate-500" title={GOLD_BUY_SELL_GAP_TOOLTIP}>
                {GOLD_BUY_SELL_GAP_LABEL}
              </div>
              <div />
              <div className="text-right text-slate-300">
                {vnBidAskSpread != null ? fmtLevel(vnBidAskSpread) : '—'}
              </div>
            </div>

            <p className="text-xs text-slate-600">
              {vnLabel}
              {vnSource === 'mock' ? <span className="text-amber-500/80"> · mock</span> : null}
            </p>
          </>
        ) : !loading && !error ? (
          <p className="text-xs text-slate-500">Chưa đủ dữ liệu hiển thị.</p>
        ) : null}
      </AssetCard>
    </div>
  )
}
