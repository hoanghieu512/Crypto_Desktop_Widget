import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchSilverWorldWithFallback } from '../api/fetchSilverWorldWithFallback'
import {
  fetchVnSilverPrices,
  type VnSilverListing,
} from '../api/fetchVnSilverPrices'
import { fetchUsdVnd } from '../api/fetchUsdVnd'
import type { StaleBannerState } from './useGoldPrice'
import { useOnlineStatus } from './useOnlineStatus'
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

const POLL_MS = 60_000

/** Băng trung tính cho bạc (VND/lượng) */
const SILVER_NEUTRAL_BAND_VND = 15_000

function primaryVnListing(listings: VnSilverListing[]): VnSilverListing | null {
  const order = ['PQBAC999_1L', 'PQBAC999_10L']
  for (const c of order) {
    const x = listings.find((l) => l.code === c)
    if (x) return x
  }
  return listings[0] ?? null
}

function mergeFxWorldStale(
  parts: Array<{ isStale: boolean; cachedAt: number }>,
): { isStale: boolean; cachedAt: number | null } {
  let isStale = false
  let cachedAt: number | null = null
  for (const p of parts) {
    if (p.isStale) {
      isStale = true
      cachedAt = cachedAt == null ? p.cachedAt : Math.min(cachedAt, p.cachedAt)
    }
  }
  return { isStale, cachedAt }
}

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
  /** Đã thử tải Phú Quý nhưng không có dòng / lỗi */
  vnSilverMissing: boolean
}

export function useSilverPrice(enabled: boolean) {
  const online = useOnlineStatus()
  const [worldBuyUsd, setWorldBuyUsd] = useState<number | null>(null)
  const [worldSellUsd, setWorldSellUsd] = useState<number | null>(null)
  const [worldMidUsd, setWorldMidUsd] = useState<number | null>(null)
  const [usdVnd, setUsdVnd] = useState<number | null>(null)
  const [vnSilverListings, setVnSilverListings] = useState<VnSilverListing[]>([])
  const [vnSilverLastUpdated, setVnSilverLastUpdated] = useState<string | null>(null)
  const [vnSilverAttempted, setVnSilverAttempted] = useState(false)
  const [loading, setLoading] = useState(enabled)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [worldError, setWorldError] = useState<string | null>(null)
  const [listingsError, setListingsError] = useState<string | null>(null)
  const [fxError, setFxError] = useState<string | null>(null)
  const [worldWarning, setWorldWarning] = useState<string | null>(null)
  const [listingsWarning, setListingsWarning] = useState<string | null>(null)
  const [staleMeta, setStaleMeta] = useState<{ isStale: boolean; cachedAt: number | null }>({
    isStale: false,
    cachedAt: null,
  })
  const [dataNonce, setDataNonce] = useState(0)
  const bypassVnCacheRef = useRef(false)

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
    else setIsRefreshing(true)
    setWorldError(null)
    setListingsError(null)
    setFxError(null)
    setWorldWarning(null)
    setListingsWarning(null)

    try {
      const bypassVn = bypassVnCacheRef.current
      bypassVnCacheRef.current = false

      const [silverWorld, phuQuy, fxResult] = await Promise.all([
        fetchSilverWorldWithFallback(),
        fetchVnSilverPrices({ bypassCache: bypassVn }),
        fetchUsdVnd(),
      ])

      if (!mounted.current) return

      setVnSilverAttempted(true)

      const staleParts: { isStale: boolean; cachedAt: number }[] = []
      if (silverWorld.ok && silverWorld.isStale) {
        staleParts.push({ isStale: true, cachedAt: silverWorld.cachedAt })
      }
      if (fxResult.ok && fxResult.isStale) {
        staleParts.push({ isStale: true, cachedAt: fxResult.cachedAt })
      }
      setStaleMeta(mergeFxWorldStale(staleParts))

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

      if (phuQuy && phuQuy.listings.length > 0) {
        setVnSilverListings(phuQuy.listings)
        setVnSilverLastUpdated(phuQuy.pageUpdatedAt)
        setListingsError(null)
        setListingsWarning(
          phuQuy.fromCache ? 'Niêm yết Phú Quý từ cache cục bộ (làm mới để tải lại).' : null,
        )
      } else {
        setVnSilverListings([])
        setVnSilverLastUpdated(null)
        setListingsError(
          'Không tải được niêm yết Phú Quý — kiểm tra mạng hoặc thử Làm mới.',
        )
      }

      if (fxResult.ok) {
        setUsdVnd(fxResult.rate)
        setFxError(null)
      } else {
        setUsdVnd(null)
        setFxError(fxResult.error)
      }
    } catch {
      if (mounted.current) {
        setWorldError('Lỗi không xác định khi tải giá bạc.')
      }
    } finally {
      firstLoadRef.current = false
      if (mounted.current) {
        setLoading(false)
        setIsRefreshing(false)
        if (enabled) setDataNonce((n) => n + 1)
      }
    }
  }, [enabled])

  const refresh = useCallback(() => {
    bypassVnCacheRef.current = true
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (!enabled) return
    const onOnline = () => void fetchAll()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [enabled, fetchAll])

  useEffect(() => {
    if (!enabled) {
      firstLoadRef.current = true
      setLoading(false)
      setIsRefreshing(false)
      setVnSilverListings([])
      setVnSilverLastUpdated(null)
      setVnSilverAttempted(false)
      setStaleMeta({ isStale: false, cachedAt: null })
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

    const primary = primaryVnListing(vnSilverListings)
    const vnMid =
      primary != null && primary.sell != null ? (primary.buy + primary.sell) / 2 : null
    const vnBuy = primary?.buy ?? null
    const vnSell = primary?.sell ?? null
    const vnLabel =
      primary != null
        ? `${primary.brand} — ${primary.name} (${primary.code})`
        : null

    const spread =
      vnMid != null && worldMidVnd != null
        ? calculateMetalSpread(vnMid, worldMidVnd)
        : null

    const spreadVnd = spread?.spreadVnd ?? 0
    const insight = spread
      ? getSpreadInsight(spreadVnd, SILVER_NEUTRAL_BAND_VND)
      : 'neutral'

    const vnSilverMissing =
      vnSilverAttempted && vnSilverListings.length === 0 && !loading

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
      updatedAt: vnSilverLastUpdated,
      vnSilverMissing,
    }
  }, [
    worldBuyUsd,
    worldSellUsd,
    worldMidUsd,
    usdVnd,
    vnSilverListings,
    vnSilverLastUpdated,
    vnSilverAttempted,
    loading,
  ])

  const staleBanner: StaleBannerState = {
    show: !online || staleMeta.isStale,
    offline: !online,
    cachedAt: staleMeta.cachedAt,
    reconnecting: Boolean(loading && online && staleMeta.isStale),
  }

  return {
    ...snapshot,
    loading,
    isRefreshing,
    worldError,
    listingsError,
    fxError,
    worldWarning,
    listingsWarning,
    dataNonce,
    isStale: staleMeta.isStale,
    cachedAt: staleMeta.cachedAt,
    staleBanner,
    listings: vnSilverListings,
    lastUpdated: vnSilverLastUpdated,
    /** cùng cờ loading tổng (spot + FX + Phú Quý) */
    isLoading: loading,
    error: listingsError,
    refresh,
    retry: refresh,
  }
}

export type UseSilverPriceResult = ReturnType<typeof useSilverPrice>
