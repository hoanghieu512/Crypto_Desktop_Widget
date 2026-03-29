import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  coefficientOfVariationPercent,
  computeSeriesTrend,
  computeShortTrend,
  volatilityLevelFromCv,
  type PriceTrend,
  type VolatilityLevel,
} from '../utils/priceMovementMath'

export type FlashDirection = 'up' | 'down' | null

export type PriceChangeInfo = {
  absolute: number | null
  percent: number | null
  direction: 'up' | 'down' | 'flat' | null
}

export type UsePriceMovementOptions = {
  enabled?: boolean
  maxPoints?: number
  sampleNonce: number
  trendWindow?: number
}

export type UsePriceMovementResult = {
  history: number[]
  change: PriceChangeInfo
  trend: PriceTrend
  sparklineTrend: PriceTrend
  volatilityCvPercent: number
  volatilityLevel: VolatilityLevel
  flashDirection: FlashDirection
}

/**
 * Lịch sử giá, delta, xu hướng (3–5 điểm), CV%, flash theo chiều thay đổi.
 * Ghi mẫu mỗi lần `sampleNonce` tăng (sau mỗi lần fetch).
 */
export function usePriceMovement(
  price: number | null,
  options: UsePriceMovementOptions,
): UsePriceMovementResult {
  const {
    enabled = true,
    maxPoints = 16,
    sampleNonce,
    trendWindow = 5,
  } = options

  const [history, setHistory] = useState<number[]>([])
  const [flashDirection, setFlashDirection] = useState<FlashDirection>(null)
  const lastNonceRef = useRef<number | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearFlashTimer = useCallback(() => {
    if (flashTimerRef.current != null) {
      clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      lastNonceRef.current = null
      clearFlashTimer()
      queueMicrotask(() => {
        setHistory([])
        setFlashDirection(null)
      })
      return
    }

    if (price == null || !Number.isFinite(price)) return
    if (lastNonceRef.current === sampleNonce) return
    lastNonceRef.current = sampleNonce

    queueMicrotask(() => {
      setHistory((h) => {
        const next = [...h, price]
        return next.length > maxPoints ? next.slice(-maxPoints) : next
      })
    })
  }, [enabled, price, sampleNonce, maxPoints, clearFlashTimer])

  useEffect(() => {
    if (history.length < 2) {
      queueMicrotask(() => setFlashDirection(null))
      return
    }
    const prev = history[history.length - 2]
    const cur = history[history.length - 1]
    clearFlashTimer()
    queueMicrotask(() => {
      if (cur > prev) setFlashDirection('up')
      else if (cur < prev) setFlashDirection('down')
      else setFlashDirection(null)
      flashTimerRef.current = setTimeout(() => {
        setFlashDirection(null)
        flashTimerRef.current = null
      }, 520)
    })
    return () => clearFlashTimer()
  }, [history, clearFlashTimer])

  const change = useMemo((): PriceChangeInfo => {
    if (history.length < 2) {
      return { absolute: null, percent: null, direction: null }
    }
    const prev = history[history.length - 2]
    const cur = history[history.length - 1]
    const absolute = cur - prev
    const pct =
      prev !== 0 && Number.isFinite(prev)
        ? (absolute / Math.abs(prev)) * 100
        : null
    let direction: PriceChangeInfo['direction'] = 'flat'
    if (absolute > 0) direction = 'up'
    else if (absolute < 0) direction = 'down'
    return { absolute, percent: pct, direction }
  }, [history])

  const trend = useMemo(
    () => computeShortTrend(history, trendWindow),
    [history, trendWindow],
  )

  const sparklineTrend = useMemo(
    () => computeSeriesTrend(history),
    [history],
  )

  const volatilityCvPercent = useMemo(
    () => coefficientOfVariationPercent(history),
    [history],
  )

  const volatilityLevel = useMemo(
    () => volatilityLevelFromCv(volatilityCvPercent),
    [volatilityCvPercent],
  )

  return {
    history,
    change,
    trend,
    sparklineTrend,
    volatilityCvPercent,
    volatilityLevel,
    flashDirection,
  }
}
