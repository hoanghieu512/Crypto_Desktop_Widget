import { memo, useEffect, useState } from 'react'
import {
  getSession,
  TRADING_SESSION_ORDER,
  type TradingSession,
} from '../utils/tradingSession'

export type SessionBoxProps = {
  name: TradingSession
  active: boolean
}

export const SessionBox = memo(function SessionBox({ name, active }: SessionBoxProps) {
  return (
    <span
      className={
        active
          ? 'rounded px-1.5 py-0.5 text-xs font-medium tracking-wide bg-bx-elevated text-bx-yellow'
          : 'rounded px-1.5 py-0.5 text-xs font-medium tracking-wide bg-bx-input text-bx-muted'
      }
    >
      {name}
    </span>
  )
})

const TICK_MS = 60_000

export const SessionBar = memo(function SessionBar() {
  const [current, setCurrent] = useState<TradingSession>(() => getSession())

  useEffect(() => {
    setCurrent(getSession())
    const id = window.setInterval(() => setCurrent(getSession()), TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      className="app-no-drag flex flex-wrap items-center gap-1"
      role="group"
      aria-label="Phiên giao dịch UTC (Asia 00–08, EU 08–16, US 16–24)"
      title="UTC: Asia 00:00–08:00 · EU 08:00–16:00 · US 16:00–24:00"
    >
      {TRADING_SESSION_ORDER.map((name) => (
        <SessionBox key={name} name={name} active={name === current} />
      ))}
    </div>
  )
})
