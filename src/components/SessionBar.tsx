import { memo, useEffect, useState } from 'react'
import {
  getSession,
  sessionRangeVn,
  TRADING_SESSION_ORDER,
  type TradingSession,
} from '../utils/tradingSession'

export type SessionBoxProps = {
  name: TradingSession
  active: boolean
}

function sessionInsight(s: TradingSession): string {
  if (s === 'ASIA') return 'Low'
  if (s === 'EU') return 'Active'
  return 'Peak'
}

export const SessionBox = memo(function SessionBox({ name, active }: SessionBoxProps) {
  return (
    <span className="relative shrink-0 group">
      <span
        tabIndex={0}
        className={
          active
            ? 'app-no-drag shrink-0 rounded px-1.5 py-0.5 text-xs font-medium tracking-wide bg-bx-elevated text-bx-yellow'
            : 'app-no-drag shrink-0 rounded px-1.5 py-0.5 text-xs font-medium tracking-wide bg-bx-input text-bx-muted hover:text-bx-secondary'
        }
      >
        {name}
      </span>
      <span
        className="app-tooltip left-1/2 top-[calc(100%+6px)] -translate-x-1/2 rounded-lg border border-bx-border-subtle bg-bx-elevated px-2 py-1.5 text-center text-meta text-bx-secondary shadow-panel"
        role="tooltip"
        aria-hidden
      >
        <span className="block text-label font-semibold text-bx-primary">{name}</span>
        <span className="block">{sessionRangeVn(name)}</span>
        <span className="block text-bx-muted">{sessionInsight(name)}</span>
      </span>
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
      className="app-no-drag flex min-w-0 flex-wrap items-center gap-1"
      role="group"
      aria-label="Phiên giao dịch — tooltip giờ Việt Nam UTC+7 (Asia 07–15, EU 15–23, US 23–07)"
    >
      {TRADING_SESSION_ORDER.map((name) => (
        <SessionBox key={name} name={name} active={name === current} />
      ))}
    </div>
  )
})
