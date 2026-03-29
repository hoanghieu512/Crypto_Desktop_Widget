import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchGoldWithFallback } from '../api/fetchGoldWithFallback'
import { VN_GOLD_ROWS } from '../constants/vnGoldLabels'

export type { VnGoldListingCode } from '../constants/vnGoldLabels'
export { VN_GOLD_ROWS }

export type VnGoldQuote = {
  code: string
  name: string
  buy: number
  sell: number
  changeBuy: number
  changeSell: number
  currency: string
}

const POLL_MS = 60_000

export function useVnMetalPrices(enabled: boolean) {
  const [goldByCode, setGoldByCode] = useState<Record<string, VnGoldQuote>>({})
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [goldFetchWarning, setGoldFetchWarning] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
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
    if (firstLoadRef.current) {
      setLoading(true)
    }
    setError(null)
    setGoldFetchWarning(null)

    try {
      const goldOutcome = await fetchGoldWithFallback()

      if (!mounted.current) return

      if (goldOutcome.ok) {
        setGoldFetchWarning(goldOutcome.warning)
        const map: Record<string, VnGoldQuote> = {}
        const prices = goldOutcome.prices
        for (const row of VN_GOLD_ROWS) {
          const p = prices[row.code]
          if (p) {
            map[row.code] = {
              code: row.code,
              name: p.name,
              buy: p.buy,
              sell: p.sell,
              changeBuy: p.change_buy,
              changeSell: p.change_sell,
              currency: p.currency,
            }
          }
        }
        setGoldByCode(map)
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
    } catch {
      if (mounted.current) {
        setError('Lỗi không xác định khi tải giá kim loại.')
      }
    } finally {
      firstLoadRef.current = false
      if (mounted.current) {
        setLoading(false)
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
    const id = window.setInterval(() => {
      void fetchAll()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [enabled, fetchAll])

  return {
    goldByCode,
    loading,
    error,
    goldFetchWarning,
    updatedAt,
    refresh: fetchAll,
  }
}
