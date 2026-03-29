import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchGoldWithFallback, type GoldPricesMap } from '../api/fetchGoldWithFallback'
import { fetchUsdVnd } from '../api/fetchUsdVnd'
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
  usdVnd: number | null
  spread: GoldSpreadNumbers | null
  insight: SpreadInsight
  updatedAt: string | null
}

export function useGoldPrice(enabled: boolean) {
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
  const [error, setError] = useState<string | null>(null)
  const [fxError, setFxError] = useState<string | null>(null)
  const [goldFetchWarning, setGoldFetchWarning] = useState<string | null>(null)
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
    if (firstLoadRef.current) setLoading(true)
    setError(null)
    setFxError(null)
    setGoldFetchWarning(null)

    try {
      const [goldOutcome, rate] = await Promise.all([
        fetchGoldWithFallback(),
        fetchUsdVnd(),
      ])

      if (!mounted.current) return

      if (goldOutcome.ok) {
        setGoldFetchWarning(goldOutcome.warning)
        setError(null)
        const prices = goldOutcome.prices
        setWorldXau(parseXauUsdTriplet(prices))
        setVnApi(pickVnSjcTriplet(prices))
        const stamp =
          goldOutcome.date && goldOutcome.time
            ? `${goldOutcome.date} ${goldOutcome.time}`
            : goldOutcome.timestamp
              ? new Date(goldOutcome.timestamp * 1000).toLocaleString('vi-VN')
              : null
        setUpdatedAt(stamp)
      } else {
        setError(goldOutcome.error)
      }

      if (rate != null) {
        setUsdVnd(rate)
      } else {
        setUsdVnd(null)
        setFxError('Không tải được tỷ giá USD/VND.')
      }
    } catch {
      if (mounted.current) setError('Lỗi không xác định khi tải giá vàng.')
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
    const mockMid =
      worldMidVnd != null ? MOCK_VN_VND_PER_LUONG : null
    const vnMid =
      vnApi?.midVnd ??
      mockMid
    const vnBuy =
      vnApi?.buyVnd ??
      (vnMid != null ? vnMid - MOCK_VN_SPREAD : null)
    const vnSell =
      vnApi?.sellVnd ??
      (vnMid != null ? vnMid + MOCK_VN_SPREAD : null)
    const vnLabel =
      vnApi?.label ?? (vnMid != null ? 'Mock (thiếu SJC API)' : null)

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
      usdVnd: rate,
      spread,
      insight,
      updatedAt,
    }
  }, [worldXau, usdVnd, vnApi, updatedAt])

  return {
    ...snapshot,
    loading,
    error,
    fxError,
    goldFetchWarning,
    dataNonce,
    refresh: fetchAll,
  }
}
