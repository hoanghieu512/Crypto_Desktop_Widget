import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchGoldWithFallback, type GoldPricesMap } from '../api/fetchGoldWithFallback'
import { fetchUsdVnd } from '../api/fetchUsdVnd'
import { useOnlineStatus } from './useOnlineStatus'
import {
  calculateGoldSpread,
  convertUsdPerTroyOzToVndPerLuong,
  getSpreadInsight,
  type GoldSpreadNumbers,
  type SpreadInsight,
} from '../utils/goldPrice'

/** Giá VN mock (VND/lượng) khi API không có SJC — chỉ demo */
export const MOCK_VN_VND_PER_LUONG = 82_000_000

export const VN_SJC_CODES = ['SJL1L10', 'VNGSJC'] as const

const POLL_MS = 60_000

const MOCK_VN_SPREAD = 80_000

export type UsdOzTriplet = {
  buyUsdPerOz: number
  sellUsdPerOz: number
  midUsdPerOz: number
}

function parseXauUsdTriplet(prices: GoldPricesMap | undefined): UsdOzTriplet | null {
  const x = prices?.XAUUSD
  if (!x || typeof x.buy !== 'number' || !Number.isFinite(x.buy) || x.buy <= 0) {
    return null
  }
  const hasSell = typeof x.sell === 'number' && x.sell > 0
  const buyUsdPerOz = x.buy
  const sellUsdPerOz = hasSell ? x.sell : x.buy
  const midUsdPerOz = (buyUsdPerOz + sellUsdPerOz) / 2
  return { buyUsdPerOz, sellUsdPerOz, midUsdPerOz }
}

function pickVnSjcTriplet(prices: GoldPricesMap | undefined): {
  buyVnd: number
  sellVnd: number
  midVnd: number
  label: string
} | null {
  if (!prices) return null
  for (const code of VN_SJC_CODES) {
    const p = prices[code]
    if (
      p &&
      typeof p.buy === 'number' &&
      typeof p.sell === 'number' &&
      p.buy > 0 &&
      p.sell > 0
    ) {
      const label =
        code === 'SJL1L10' ? 'SJC 9999 (SJL1L10)' : 'Vàng SJC (VNGSJC)'
      return {
        buyVnd: p.buy,
        sellVnd: p.sell,
        midVnd: (p.buy + p.sell) / 2,
        label,
      }
    }
  }
  return null
}

export type StaleBannerState = {
  show: boolean
  offline: boolean
  cachedAt: number | null
  reconnecting: boolean
}

export type GoldPriceSnapshot = {
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
  vnSource: 'api' | 'mock'
  /** API có XAU/thế giới nhưng không có mã SJC trong bảng */
  vnSjcMissing: boolean
  usdVnd: number | null
  spread: GoldSpreadNumbers | null
  insight: SpreadInsight
  updatedAt: string | null
}

function mergeGoldFxStale(
  gold: { ok: true; isStale: boolean; cachedAt: number } | { ok: false } | null,
  fx: { ok: true; isStale: boolean; cachedAt: number } | { ok: false } | null,
): { isStale: boolean; cachedAt: number | null } {
  let isStale = false
  let cachedAt: number | null = null
  if (gold?.ok === true && gold.isStale) {
    isStale = true
    cachedAt = gold.cachedAt
  }
  if (fx?.ok === true && fx.isStale) {
    isStale = true
    cachedAt =
      cachedAt == null ? fx.cachedAt : Math.min(cachedAt, fx.cachedAt)
  }
  return { isStale, cachedAt }
}

export function useGoldPrice(enabled: boolean) {
  const online = useOnlineStatus()
  const [worldXau, setWorldXau] = useState<UsdOzTriplet | null>(null)
  const [usdVnd, setUsdVnd] = useState<number | null>(null)
  const [vnApi, setVnApi] = useState<{
    buyVnd: number
    sellVnd: number
    midVnd: number
    label: string
  } | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fxError, setFxError] = useState<string | null>(null)
  const [goldFetchWarning, setGoldFetchWarning] = useState<string | null>(null)
  const [staleMeta, setStaleMeta] = useState<{ isStale: boolean; cachedAt: number | null }>({
    isStale: false,
    cachedAt: null,
  })
  const [vnSjcMissing, setVnSjcMissing] = useState(false)
  /** Tăng mỗi lần fetch xong — dùng cho lịch sử giá / sparkline */
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
    const initial = firstLoadRef.current
    if (initial) setLoading(true)
    else setIsRefreshing(true)
    setError(null)
    setFxError(null)
    setGoldFetchWarning(null)

    try {
      const [goldOutcome, fxResult] = await Promise.all([
        fetchGoldWithFallback(),
        fetchUsdVnd(),
      ])

      if (!mounted.current) return

      const goldOk = goldOutcome.ok ? goldOutcome : null
      const fxOk = fxResult.ok ? fxResult : null
      setStaleMeta(
        mergeGoldFxStale(
          goldOk
            ? { ok: true, isStale: goldOk.isStale, cachedAt: goldOk.cachedAt }
            : null,
          fxOk ? { ok: true, isStale: fxOk.isStale, cachedAt: fxOk.cachedAt } : null,
        ),
      )

      if (goldOutcome.ok) {
        setGoldFetchWarning(goldOutcome.warning)
        setError(null)
        const prices = goldOutcome.prices
        const world = parseXauUsdTriplet(prices)
        const vn = pickVnSjcTriplet(prices)
        setWorldXau(world)
        setVnApi(vn)
        setVnSjcMissing(vn == null && world != null)
        const stamp =
          goldOutcome.date && goldOutcome.time
            ? `${goldOutcome.date} ${goldOutcome.time}`
            : goldOutcome.timestamp
              ? new Date(goldOutcome.timestamp * 1000).toLocaleString('vi-VN')
              : null
        setUpdatedAt(stamp)
      } else {
        setVnSjcMissing(false)
        setError(goldOutcome.error)
      }

      if (fxResult.ok) {
        setUsdVnd(fxResult.rate)
        setFxError(null)
      } else {
        setUsdVnd(null)
        setFxError(fxResult.error)
      }
    } catch {
      if (mounted.current) setError('Lỗi không xác định khi tải giá vàng.')
    } finally {
      firstLoadRef.current = false
      if (mounted.current) {
        setLoading(false)
        // Phải clear cả isRefreshing — nếu không, nút Làm mới (loading = isRefreshing
        // || extraRefreshing) kẹt spinner vô hạn dù fetch đã xong / lỗi / timeout.
        setIsRefreshing(false)
        if (enabled) setDataNonce((n) => n + 1)
      }
    }
  }, [enabled])

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
      setStaleMeta({ isStale: false, cachedAt: null })
      setVnSjcMissing(false)
      return
    }
    void fetchAll()
    const id = window.setInterval(() => void fetchAll(), POLL_MS)
    return () => window.clearInterval(id)
  }, [enabled, fetchAll])

  const snapshot = useMemo((): GoldPriceSnapshot => {
    const rate = usdVnd

    const worldBuyVnd =
      worldXau != null && rate != null
        ? convertUsdPerTroyOzToVndPerLuong(worldXau.buyUsdPerOz, rate)
        : null
    const worldSellVnd =
      worldXau != null && rate != null
        ? convertUsdPerTroyOzToVndPerLuong(worldXau.sellUsdPerOz, rate)
        : null
    const worldMidVnd =
      worldXau != null && rate != null
        ? convertUsdPerTroyOzToVndPerLuong(worldXau.midUsdPerOz, rate)
        : null

    const vnSource: 'api' | 'mock' = vnApi ? 'api' : 'mock'
    const useMockVn = !vnSjcMissing && vnApi == null
    const mockMid =
      useMockVn && worldMidVnd != null ? MOCK_VN_VND_PER_LUONG : null
    const vnMid = vnApi?.midVnd ?? mockMid
    const vnBuy =
      vnApi?.buyVnd ??
      (useMockVn && vnMid != null ? vnMid - MOCK_VN_SPREAD : null)
    const vnSell =
      vnApi?.sellVnd ??
      (useMockVn && vnMid != null ? vnMid + MOCK_VN_SPREAD : null)
    const vnLabel =
      vnApi?.label ?? (useMockVn && vnMid != null ? 'Mock (thiếu SJC API)' : null)

    /** So sánh VN vs TG theo giá bán (bán ra), không dùng giữa */
    const spread =
      vnSell != null && worldSellVnd != null
        ? calculateGoldSpread(vnSell, worldSellVnd)
        : null

    const insight = spread ? getSpreadInsight(spread.spreadVnd) : 'neutral'

    return {
      worldBuyUsdPerOz: worldXau?.buyUsdPerOz ?? null,
      worldSellUsdPerOz: worldXau?.sellUsdPerOz ?? null,
      worldMidUsdPerOz: worldXau?.midUsdPerOz ?? null,
      worldBuyVndPerLuong: worldBuyVnd,
      worldSellVndPerLuong: worldSellVnd,
      worldMidVndPerLuong: worldMidVnd,
      vnBuyVndPerLuong: vnBuy,
      vnSellVndPerLuong: vnSell,
      vnMidVndPerLuong: vnMid,
      vnLabel,
      vnSource,
      vnSjcMissing,
      usdVnd: rate,
      spread,
      insight,
      updatedAt,
    }
  }, [worldXau, usdVnd, vnApi, vnSjcMissing, updatedAt])

  const staleBanner: StaleBannerState = {
    show: !online || staleMeta.isStale,
    offline: !online,
    cachedAt: staleMeta.cachedAt,
    reconnecting: Boolean(loading && online && staleMeta.isStale),
  }

  return {
    ...snapshot,
    loading,
    isLoading: loading,
    isRefreshing,
    error,
    fxError,
    goldFetchWarning,
    dataNonce,
    isStale: staleMeta.isStale,
    cachedAt: staleMeta.cachedAt,
    staleBanner,
    refresh: fetchAll,
    retry: fetchAll,
  }
}
