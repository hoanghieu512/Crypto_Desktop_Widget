export type FundingRateInfo = {
  symbol: string
  fundingRate: number
  nextFundingTime: number
}

export type FundingPayment = {
  fundingRate: number
  fundingTime: number
}

export type FundingResult = {
  totalFundingPnL: number
  fundingPaymentsCount: number
  /** Signed estimate for 24h: currentRate × 3. */
  estimatedDailyFunding: number
}

