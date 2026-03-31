import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { PositionComputed } from '../hooks/usePortfolio'
import { useFormat } from '../providers/FormatProvider'

function fmtSignedPct(p: number): string {
  const sign = p > 0 ? '+' : ''
  return `${sign}${p.toFixed(2)}%`
}

export type PositionRowProps = {
  row: PositionComputed
  onDelete: (id: string) => void
  onEdit?: (id: string) => void
}

export const PositionRow = memo(function PositionRow({ row, onDelete, onEdit }: PositionRowProps) {
  const { formatPrice, formatPriceSigned } = useFormat()
  const p = row.position

  const pnl = row.unrealizedPnl
  const roe = row.roe
  const tone = pnl == null ? 'text-bx-muted' : pnl >= 0 ? 'text-profit' : 'text-loss'

  const sideBadge =
    p.side === 'LONG'
      ? 'bg-profit/15 text-profit ring-1 ring-inset ring-profit/20'
      : 'bg-loss/15 text-loss ring-1 ring-inset ring-loss/20'

  const levBadge = 'rounded-full bg-bx-elevated px-2 py-0.5 text-meta font-semibold text-bx-secondary'

  // Subtle pulse when pnl changes "enough", throttled.
  const prevPnlRef = useRef<number | null>(null)
  const [flashClass, setFlashClass] = useState('')
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (pnl == null || !Number.isFinite(pnl)) {
      prevPnlRef.current = null
      return
    }
    const prev = prevPnlRef.current
    prevPnlRef.current = pnl
    if (prev == null || !Number.isFinite(prev)) return
    const delta = pnl - prev
    const absDelta = Math.abs(delta)
    const threshold = Math.max(0.5, Math.abs(prev) * 0.03)
    if (absDelta < threshold) return

    const next = delta >= 0 ? 'app-price-flash-up' : 'app-price-flash-down'
    setFlashClass(next)
    if (flashTimerRef.current != null) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = window.setTimeout(() => {
      flashTimerRef.current = null
      setFlashClass('')
    }, 520)
    return () => {
      if (flashTimerRef.current != null) clearTimeout(flashTimerRef.current)
    }
  }, [pnl])

  const markLabel = useMemo(() => {
    if (row.markPrice != null) return formatPrice(row.markPrice, 'crypto')
    return row.markMissing ? `${formatPrice(p.entryPrice, 'crypto')} (fallback)` : '…'
  }, [row.markPrice, row.markMissing, p.entryPrice, formatPrice])

  const onDeleteClick = () => {
    const ok = window.confirm(`Delete ${p.symbol} ${p.side}?`)
    if (ok) onDelete(p.id)
  }

  return (
    <li className={`list-none rounded-xl border border-white/[0.06] bg-bx-surface/60 app-pad-md shadow-panel ${flashClass}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-mono text-symbol font-semibold text-bx-primary">{p.symbol}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-meta font-semibold ${sideBadge}`}>
              {p.side}
            </span>
            <span className={levBadge}>{p.leverage.toFixed(0)}x</span>
            {row.markMissing ? (
              <span className="shrink-0 rounded bg-bx-input px-1.5 py-0.5 text-meta text-amber-200/80" title="Mark price chưa có — dùng entry làm fallback">
                !
              </span>
            ) : null}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-label text-bx-secondary">
            <div className="flex justify-between gap-2">
              <span className="text-bx-muted">Entry</span>
              <span className="font-mono tabular-nums text-bx-secondary">{formatPrice(p.entryPrice, 'crypto')}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-bx-muted">Mark</span>
              <span className="font-mono tabular-nums text-bx-secondary">{markLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-bx-muted">Qty</span>
              <span className="font-mono tabular-nums text-bx-secondary">{p.quantity}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-bx-muted">Margin</span>
              <span className="font-mono tabular-nums text-bx-secondary">{formatPrice(row.margin, 'crypto')}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="app-vstack-xs items-end">
            <div className={`font-mono text-price font-semibold tabular-nums ${tone}`}>
              {pnl == null ? '—' : formatPriceSigned(pnl, 'crypto')}
            </div>
            <div className={`text-label font-semibold tabular-nums ${tone}`}>
              {roe == null ? '—' : fmtSignedPct(roe)}
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            {onEdit ? (
              <button
                type="button"
                className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-2 py-1 text-meta text-bx-secondary hover:text-bx-primary"
                onClick={() => onEdit(p.id)}
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-2 py-1 text-meta text-bx-secondary hover:border-bx-red/40 hover:text-bx-red"
              onClick={onDeleteClick}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  )
})

