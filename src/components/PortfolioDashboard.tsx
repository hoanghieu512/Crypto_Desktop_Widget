import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePortfolio } from '../hooks/usePortfolio'
import { useFormat } from '../providers/FormatProvider'
import { PositionRow } from './PositionRow'
import { AddPositionForm } from './AddPositionForm'

function fmtSignedPct(p: number): string {
  const sign = p > 0 ? '+' : ''
  return `${sign}${p.toFixed(2)}%`
}

type Props = {
  active: boolean
  /** Render inside side panel (no outer page padding/title). */
  embedded?: boolean
}

export function PortfolioDashboard({ active, embedded = false }: Props) {
  const { formatPrice, formatPriceSigned } = useFormat()
  const pf = usePortfolio(active)

  const [open, setOpen] = useState(false)
  const [enter, setEnter] = useState(false)

  useEffect(() => {
    if (!open) return
    let raf2: number | null = null
    const raf1 = requestAnimationFrame(() => {
      setEnter(false)
      raf2 = requestAnimationFrame(() => setEnter(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2 != null) cancelAnimationFrame(raf2)
    }
  }, [open])

  const pnl = pf.totals.totalUnrealizedPnl
  const roe = pf.totals.totalRoe
  const tone = pnl >= 0 ? 'text-profit' : 'text-loss'

  const summary = useMemo(() => {
    return [
      { label: 'Total margin', value: formatPrice(pf.totals.totalMargin, 'crypto'), tone: 'text-bx-primary' },
      { label: 'Unrealized PnL', value: formatPriceSigned(pnl, 'crypto'), tone },
      { label: 'Total ROE', value: roe == null ? '—' : fmtSignedPct(roe), tone },
    ]
  }, [formatPrice, formatPriceSigned, pf.totals.totalMargin, pnl, roe, tone])

  return (
    <div
      className={`app-no-drag relative flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden ${
        embedded ? '' : 'px-3 pb-4 pt-1 max-[299px]:px-2 min-[361px]:px-4 min-[361px]:pb-4'
      }`.trim()}
    >
      <div className="shrink-0 app-panel rounded-2xl border border-white/[0.07] bg-bx-surface shadow-panel">
        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
          <div className="min-w-0">
            {!embedded ? (
              <>
                <h2 className="text-symbol font-semibold text-bx-primary">Portfolio</h2>
                <p className="mt-1 text-meta text-bx-muted">Futures mark · manual positions</p>
              </>
            ) : (
              <p className="text-meta text-bx-muted">Futures mark · manual positions</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="app-no-drag rounded-lg bg-bx-yellow px-3 py-2 text-label font-semibold text-bx-add-fg hover:opacity-95"
              onClick={() => setOpen(true)}
            >
              Add
            </button>
            {pf.positions.length > 0 ? (
              <button
                type="button"
                className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-3 py-2 text-label font-semibold text-bx-secondary hover:text-bx-primary"
                onClick={() => {
                  const ok = window.confirm('Clear all positions?')
                  if (ok) pf.clearAll()
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {summary.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-bx-base/40 app-pad-md">
              <p className="text-meta uppercase tracking-wide text-bx-muted">{s.label}</p>
              <p className={`mt-1 font-mono text-price font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {pf.positions.length === 0 ? (
          <div className="app-panel rounded-2xl border border-white/[0.07] bg-bx-surface shadow-panel">
            <p className="text-label font-semibold text-bx-primary">No positions yet</p>
            <p className="mt-1 text-label text-bx-secondary">Add your first futures position to track unrealized PnL.</p>
            <button
              type="button"
              className="mt-3 app-no-drag rounded-lg bg-bx-yellow px-3 py-2 text-label font-semibold text-bx-add-fg hover:opacity-95"
              onClick={() => setOpen(true)}
            >
              Add position
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {pf.computed.map((row) => (
              <PositionRow
                key={row.position.id}
                row={row}
                onDelete={pf.removePosition}
              />
            ))}
          </ul>
        )}
      </div>

      {open ? (
        createPortal(
          <div
            className="pointer-events-auto fixed inset-0 z-[220] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Add position"
          >
            <button
              type="button"
              className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-180 ease-out ${
                enter ? 'opacity-100' : 'opacity-0'
              }`}
              aria-label="Close"
              onClick={() => setOpen(false)}
            />
            <div
              className={`absolute left-1/2 top-[12px] w-[min(360px,calc(100%-24px))] -translate-x-1/2 rounded-2xl border border-white/[0.08] bg-bx-surface shadow-2xl shadow-black/60 ring-1 ring-black/30 ${
                enter ? 'opacity-100' : 'opacity-0'
              } transition-[transform,opacity] duration-180 ease-out`}
              style={{
                transform: enter
                  ? 'translate3d(-50%,0,0) scale(1)'
                  : 'translate3d(-50%,8px,0) scale(0.98)',
              }}
            >
              <div className="app-panel">
                <AddPositionForm
                  onCancel={() => setOpen(false)}
                  onSubmit={(data) => {
                    pf.addPosition(data)
                    setOpen(false)
                  }}
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      ) : null}
    </div>
  )
}

