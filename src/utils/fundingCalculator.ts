import type { FuturesPosition } from '../types/portfolio'
import type { FundingPayment, FundingRateInfo, FundingResult } from '../types/funding'

export function calculateFundingPnL(params: {
  position: FuturesPosition
  fundingHistory: FundingPayment[]
  /** Optional current mark for estimating daily funding. */
  currentMarkPrice?: number | null
  /** Optional current funding info (for daily estimate). */
  currentRateInfo?: FundingRateInfo | null
}): FundingResult {
  const { position, fundingHistory, currentMarkPrice, currentRateInfo } = params
  const notionalOpen = position.quantity * position.entryPrice
  const sign = position.side === 'SHORT' ? 1 : -1

  let total = 0
  let count = 0
  for (const p of fundingHistory) {
    if (!p || !Number.isFinite(p.fundingRate) || !Number.isFinite(p.fundingTime)) continue
    if (p.fundingTime < position.createdAt) continue
    const amt = notionalOpen * p.fundingRate * sign
    if (!Number.isFinite(amt)) continue
    total += amt
    count += 1
  }

  const curRate = currentRateInfo?.fundingRate
  const notionalNow =
    currentMarkPrice != null && Number.isFinite(currentMarkPrice) && currentMarkPrice > 0
      ? position.quantity * currentMarkPrice
      : notionalOpen
  const estDaily =
    curRate != null && Number.isFinite(curRate) ? notionalNow * curRate * 3 * sign : 0

  return {
    totalFundingPnL: Number.isFinite(total) ? total : 0,
    fundingPaymentsCount: count,
    estimatedDailyFunding: Number.isFinite(estDaily) ? estDaily : 0,
  }
}

export function adjustedMargin(position: FuturesPosition, fundingPnL: number): number {
  if (position.marginMode === 'isolated') {
    const base = position.initialMargin != null && position.initialMargin > 0 ? position.initialMargin : position.margin
    return base + fundingPnL
  }
  return position.margin
}

