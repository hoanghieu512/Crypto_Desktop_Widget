import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { PositionComputed } from '../hooks/usePortfolio'
import { useFormat } from '../providers/FormatProvider'
import { formatSize } from '../utils/formatNumber'
import { getPnlIntensityClass } from '../utils/formatPnl'
import type { FundingResult } from '../types/funding'
import { adjustedMargin } from '../utils/fundingCalculator'

function fmtSignedPct(p: number): string {
  const sign = p > 0 ? '+' : ''
  return `${sign}${p.toFixed(2)}%`
}

export type PositionRowProps = {
  row: PositionComputed
  onDelete: (id: string) => void
  onEdit?: (id: string) => void
  onUpdateNote?: (id: string, notes: string) => void
  funding?: FundingResult
  /** Optional drag handle (manual positions only). */
  dragHandle?: ReactNode
  /** Sortable container ref (li). */
  setNodeRef?: (el: HTMLLIElement | null) => void
  /** Sortable transform/transition styles. */
  style?: CSSProperties
}

export const PositionRow = memo(function PositionRow({
  row,
  onDelete,
  onEdit,
  onUpdateNote,
  funding,
  dragHandle,
  setNodeRef,
  style,
}: PositionRowProps) {
  const { formatPrice, formatPriceSigned } = useFormat()
  const p = row.position

  const pnl = row.unrealizedPnl
  const fundingPnl = funding?.totalFundingPnL ?? 0
  const totalPnl = (pnl ?? 0) + (Number.isFinite(fundingPnl) ? fundingPnl : 0)
  const adjMargin = adjustedMargin(p, fundingPnl)
  const roe =
    adjMargin > 0 && Number.isFinite(totalPnl) ? (totalPnl / adjMargin) * 100 : row.roe
  const tone = getPnlIntensityClass(roe ?? null)

  const sideBadge =
    p.side === 'LONG'
      ? 'bg-profit/15 text-profit ring-1 ring-inset ring-profit/20'
      : 'bg-loss/15 text-loss ring-1 ring-inset ring-loss/20'

  const levBadge = 'rounded-full bg-bx-elevated px-2 py-0.5 text-meta font-semibold text-bx-secondary'
  const modeBadge =
    p.marginMode === 'isolated'
      ? 'rounded-full bg-orange-500/20 px-2 py-0.5 text-meta font-semibold text-orange-400'
      : 'rounded-full bg-gray-500/20 px-2 py-0.5 text-meta font-semibold text-gray-400'

  const fundingTone = getPnlIntensityClass(adjMargin > 0 ? (fundingPnl / adjMargin) * 100 : null)

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
    if (p.source === 'synced') return
    const ok = window.confirm(`Delete ${p.symbol} ${p.side}?`)
    if (ok) onDelete(p.id)
  }

  const isManual = p.source !== 'synced'
  const hasNote = isManual && typeof p.notes === 'string' && p.notes.trim().length > 0
  const notePreview = hasNote ? p.notes!.trim().slice(0, 100) + (p.notes!.trim().length > 100 ? '…' : '') : ''
  const [noteOpen, setNoteOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => (typeof p.notes === 'string' ? p.notes : ''))
  useEffect(() => {
    // keep draft in sync when row updates
    setDraft(typeof p.notes === 'string' ? p.notes : '')
  }, [p.notes])

  const canEditNote = isManual && onUpdateNote != null
  const saveNote = () => {
    if (!canEditNote) return
    onUpdateNote(p.id, draft)
    setEditing(false)
    setNoteOpen(true)
  }
  const cancelEdit = () => {
    setDraft(typeof p.notes === 'string' ? p.notes : '')
    setEditing(false)
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`list-none rounded-xl border border-white/[0.06] bg-bx-surface/60 app-pad-md shadow-panel ${flashClass}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        {dragHandle ? <div className="shrink-0 pt-0.5">{dragHandle}</div> : null}
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-mono text-symbol font-semibold text-bx-primary">{p.symbol}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-meta font-semibold ${sideBadge}`}>
              {p.side}
            </span>
            <span className={levBadge}>{p.leverage.toFixed(0)}x</span>
            <span className={modeBadge}>{p.marginMode === 'isolated' ? 'ISO' : 'CROSS'}</span>
            {canEditNote ? (
              <button
                type="button"
                className={`app-no-drag rounded-md px-1.5 py-1 text-[12px] ${
                  hasNote ? 'text-accent hover:bg-bx-elevated' : 'text-bx-muted hover:bg-bx-elevated hover:text-bx-secondary'
                }`}
                title={hasNote ? notePreview : 'Add note'}
                onClick={() => {
                  setNoteOpen((v) => !v)
                  if (!hasNote) setEditing(true)
                }}
                aria-label={hasNote ? 'View note' : 'Add note'}
              >
                📝
              </button>
            ) : null}
            {p.source === 'synced' ? (
              <span className="shrink-0 rounded-full bg-accent/[0.14] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                Synced
              </span>
            ) : null}
            {row.markMissing ? (
              <span className="shrink-0 rounded bg-bx-input px-1.5 py-0.5 text-meta text-amber-200/80" title="Mark price chưa có — dùng entry làm fallback">
                !
              </span>
            ) : null}
          </div>

          {canEditNote && noteOpen ? (
            <div className="mt-2 rounded-xl border border-bx-border-subtle bg-bx-base/40 px-3 py-2">
              {editing ? (
                <div className="app-vstack-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-bx-primary">Note</p>
                    <p className="text-[11px] font-mono text-bx-muted">{Math.min(500, draft.length)}/500</p>
                  </div>
                  <textarea
                    className="app-no-drag w-full resize-none rounded-lg border border-bx-border-medium bg-bx-input px-2 py-2 text-[12px] text-bx-primary outline-none focus:ring-1 focus:ring-accent/40"
                    rows={4}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                    placeholder="Add trading notes... (thesis, exit plan, SL/TP, etc.)"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelEdit()
                      }
                      const isSave = (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                      if (isSave) {
                        e.preventDefault()
                        saveNote()
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-3 py-1.5 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="app-no-drag rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-bx-add-fg disabled:opacity-60"
                      onClick={saveNote}
                      disabled={draft.length > 500}
                      title="Cmd/Ctrl+Enter to save"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap text-[12px] text-bx-secondary">
                    {hasNote ? p.notes!.trim() : 'No note.'}
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-2 py-1 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary"
                      onClick={() => setEditing(true)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-2 py-1 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary"
                      onClick={() => setNoteOpen(false)}
                      aria-label="Close note"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

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
              <span className="text-bx-muted">Notional</span>
              <span className="font-mono tabular-nums text-bx-secondary">
                {formatPrice(row.notional, 'crypto')}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-bx-muted">Margin</span>
              <span className="font-mono tabular-nums text-bx-secondary">
                {formatPrice(adjMargin, 'crypto')}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-bx-muted">Size</span>
              <span className="font-mono tabular-nums text-bx-secondary">
                {formatSize(p.quantity)} {p.symbol.replace(/USDT$/i, '')}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-bx-muted">Funding</span>
              <span className={`font-mono tabular-nums ${fundingTone}`}>
                {formatPriceSigned(fundingPnl, 'crypto')}
              </span>
            </div>
          </div>
        </div>

          <div className="shrink-0 text-right">
          <div className="app-vstack-xs items-end">
            <div className={`font-mono text-price font-semibold tabular-nums ${tone}`}>
              {pnl == null ? '—' : formatPriceSigned(totalPnl, 'crypto')}
            </div>
            <div className={`text-label font-semibold tabular-nums ${tone}`}>
              {roe == null ? '—' : fmtSignedPct(roe)}
            </div>
            {pnl != null ? (
              <div className="mt-0.5 text-[11px] text-bx-muted">
                <span className="font-mono tabular-nums">{formatPriceSigned(pnl ?? 0, 'crypto')}</span>
                <span> price</span>
                <span className="mx-1">·</span>
                <span className={`font-mono tabular-nums ${fundingTone}`}>{formatPriceSigned(fundingPnl, 'crypto')}</span>
                <span className="text-bx-muted"> funding</span>
              </div>
            ) : null}
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
            {p.source !== 'synced' ? (
              <button
                type="button"
                className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-2 py-1 text-meta text-bx-secondary hover:border-bx-red/40 hover:text-bx-red"
                onClick={onDeleteClick}
              >
                Delete
              </button>
            ) : null}
          </div>
          </div>
        </div>
      </div>
    </li>
  )
})

