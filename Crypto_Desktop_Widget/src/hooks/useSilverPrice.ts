import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchGoldWithFallback } from '../api/fetchGoldWithFallback'
import { fetchSilverWorldWithFallback } from '../api/fetchSilverWorldWithFallback'
import { fetchUsdVnd } from '../api/fetchUsdVnd'
import {
  convertUsdPerTroyOzToVndPerLuong,
  getSpreadInsight,
  spreadInsightLabelVi,
  type SpreadInsight,
} from '../utils/goldPrice'
import {
  calculateMetalSpread,
  metalSpreadAccentClass,
} from '../utils/metalSpot'
import { pickVnSilverFromPrices, type VnSilverQuote } from '../utils/vnSilverFromPrices'

const POLL_MS = 60_000

/** Băng trung tính cho bạc (VND/lượng) */
const SILVER_NEUTRAL_BAND_VND = 15_000

export type SilverPriceSnapshot = {
  worldBuyUsdPerOz: number | null
  worldSellUsdPerOz: number | null
  worldMidUsdPerOz: number | null
  worldBuyVndPerLuong: number | null
  worldSellVndPerLuong: number | null
  worldMidVndPerLuong: number | null
  vnBuyVndPerLuong: number | null
  vnSellVndPerLuong: number | null
  vnMidVndPerLuong: number | null
  vnLabel: string | null
  usdVnd: number | null
  spread: ReturnType<typeof calculateMetalSpread>
  insight: SpreadInsight
  spreadAccentClass: string
  spreadInsightLabel: string
  updatedAt: string | null
  /** Đã tải bảng niêm yết nhưng không có dòng bạc VN */
  vnSilverMissing: boolean
}

export function useSilverPrice(enabled: boolean) {
  const [worldBuyUsd, setWorldBuyUsd] = useState<number | null>(null)
  const [worldSellUsd, setWorldSellUsd] = useState<number | null>(null)
  const [worldMidUsd, setWorldMidUsd] = useState<number | null>(null)
  const [usdVnd, setUsdVnd] = useState<number | null>(null)
  const [vnSilver, setVnSilver] = useState<VnSilverQuote | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  /** Lần tải niêm yết gần nhất thành công (dùng để biết “không có dòng bạc” vs “lỗi mạng”) */
  const [listingsSucceeded, setListingsSucceeded] = useState(false)
  const [loading, setLoading] = useState(enabled)
  const [worldError, setWorldError] = useState<string | null>(null)
  const [listingsError, setListingsError] = useState<string | null>(null)
  const [fxError, setFxError] = useState<string | null>(null)
  const [worldWarning, setWorldWarning] = useState<string | null>(null)
  const [listingsWarning, setListingsWarning] = useState<string | null>(null)
  const [dataNonce, setDataNonce] = useState(0)

  const mounted = useRef(true)
  const firstLoadRef = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const fetchAll = useCallback(async () => {
    if (!enabled) return
    if (firstLoadRef.current) setLoading(true)
    setWorldError(null)
    setListingsError(null)
    setFxError(null)
    setWorldWarning(null)
    setListingsWarning(null)

    try {
      const [silverWorld, goldOutcome, rate] = await Promise.all([
        fetchSilverWorldWithFallback(),
        fetchGoldWithFallback(),
        fetchUsdVnd(),
      ])

      if (!mounted.current) return

      if (silverWorld.ok) {
        setWorldWarning(silverWorld.warning)
        setWorldBuyUsd(silverWorld.buyUsdPerOz)
        setWorldSellUsd(silverWorld.sellUsdPerOz)
        setWorldMidUsd(silverWorld.midUsdPerOz)
        setWorldError(null)
      } else {
        setWorldBuyUsd(null)
        setWorldSellUsd(null)
        setWorldMidUsd(null)
        setWorldError(silverWorld.error)
      }

      if (goldOutcome.ok) {
        setListingsSucceeded(true)
        setListingsWarning(goldOutcome.warning)
        setListingsError(null)
        setVnSilver(pickVnSilverFromPrices(goldOutcome.prices))
        const stamp =
          goldOutcome.date && goldOutcome.time
            ? `${goldOutcome.date} ${goldOutcome.time}`
            : goldOutcome.timestamp
              ? new Date(goldOutcome.timestamp * 1000).toLocaleString('vi-VN')
              : null
        setUpdatedAt(stamp)
      } else {
        setListingsSucceeded(false)
        setListingsError(goldOutcome.error)
      }

      if (rate != null) {
        setUsdVnd(rate)
        setFxError(null)
      } else {
        setUsdVnd(null)
        setFxError('Không tải được tỷ giá USD/VND.')
      }
    } catch {
      if (mounted.current) {
        setWorldError('Lỗi không xác định khi tải giá bạc.')
      }
    } finally {
      firstLoadRef.current = false
      if (mounted.current) {
        setLoading(false)
        if (enabled) setDataNonce((n) => n + 1)
      }
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      firstLoadRef.current = true
      setLoading(false)
      setListingsSucceeded(false)
      return
    }
    void fetchAll()
    const id = window.setInterval(() => void fetchAll(), POLL_MS)
    return () => window.clearInterval(id)
  }, [enabled, fetchAll])

  const snapshot = useMemo((): SilverPriceSnapshot => {
    const rate = usdVnd

    const worldBuyVnd =
      worldBuyUsd != null && rate != null
        ? convertUsdPerTroyOzToVndPerLuong(worldBuyUsd, rate)
        : null
    const worldSellVnd =
      worldSellUsd != null && rate != null
        ? convertUsdPerTroyOzToVndPerLuong(worldSellUsd, rate)
        : null
    const worldMidVnd =
      worldMidUsd != null && rate != null
        ? convertUsdPerTroyOzToVndPerLuong(worldMidUsd, rate)
        : null

    const vnMid = vnSilver?.midVndPerLuong ?? null
    const vnBuy = vnSilver?.buy ?? null
    const vnSell = vnSilver?.sell ?? null
    const vnLabel = vnSilver ? `${vnSilver.name} (${vnSilver.code})` : null

    const spread =
      vnMid != null && worldMidVnd != null
        ? calculateMetalSpread(vnMid, worldMidVnd)
        : null

    const spreadVnd = spread?.spreadVnd ?? 0
    const insight = spread
      ? getSpreadInsight(spreadVnd, SILVER_NEUTRAL_BAND_VND)
      : 'neutral'

    return {
      worldBuyUsdPerOz: worldBuyUsd,
      worldSellUsdPerOz: worldSellUsd,
      worldMidUsdPerOz: worldMidUsd,
      worldBuyVndPerLuong: worldBuyVnd,
      worldSellVndPerLuong: worldSellVnd,
      worldMidVndPerLuong: worldMidVnd,
      vnBuyVndPerLuong: vnBuy,
      vnSellVndPerLuong: vnSell,
      vnMidVndPerLuong: vnMid,
      vnLabel,
      usdVnd: rate,
      spread,
      insight,
      spreadAccentClass: spread
        ? metalSpreadAccentClass(spreadVnd, SILVER_NEUTRAL_BAND_VND)
        : 'text-slate-400',
      spreadInsightLabel: spreadInsightLabelVi(insight),
      updatedAt,
      vnSilverMissing: listingsSucceeded && vnSilver == null,
    }
  }, [
    worldBuyUsd,
    worldSellUsd,
    worldMidUsd,
    usdVnd,
    vnSilver,
    updatedAt,
    listingsSucceeded,
  ])

  return {
    ...snapshot,
    loading,
    worldError,
    listingsError,
    fxError,
    worldWarning,
    listingsWarning,
    dataNonce,
    refresh: fetchAll,
  }
}
