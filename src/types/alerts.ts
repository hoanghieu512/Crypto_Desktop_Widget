export type AlertCondition = 'above' | 'below'

export type PriceAlert = {
  id: string
  symbol: string
  targetPrice: number
  condition: AlertCondition
  enabled: boolean
  triggered: boolean
  createdAt: number
  triggeredAt?: number
}

export type PriceAlertSettings = {
  v: 1
  soundEnabled: boolean
}

