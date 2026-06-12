import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { useBinanceSync } from '../hooks/useBinanceSync'
import { usePortfolio } from '../hooks/usePortfolio'
import { useFormat } from '../providers/FormatProvider'
import { PositionRow } from './PositionRow'
import { AddPositionForm } from './AddPositionForm'
import { ApiKeySettings } from './ApiKeySettings'
import { PortfolioSettingsMenu } from './PortfolioSettingsMenu'
import { getPnlIntensityClass } from '../utils/formatPnl'
import { useFundingData } from '../hooks/useFundingData'
import { adjustedMargin } from '../utils/fundingCalculator'
import { PortfolioSkeleton } from './PortfolioSkeleton'
import { ErrorState } from './ErrorState'
import { RefreshButton } from './RefreshButton'
import { binanceErrorToVi } from '../utils/friendlyErrors'

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
  const bx = useBinanceSync(active)
  const lastSyncedKeyRef = useRef<string>('')

  const [open, setOpen] = useState(false)
  const [enter, setEnter] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  const markBySymbolUpper = useMemo(() => {
    const out: Record<string, number | null> = {}
    for (const r of pf.computed) {
      const sym = String(r.position.symbol ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (!sym) continue
      if (sym in out) continue
      out[sym] = r.markPrice
    }
    return out
  }, [pf.computed])

  const funding = useFundingData({ positions: pf.positions, markPriceBySymbolUpper: markBySymbolUpper })

  const totalsWithFunding = useMemo(() => {
    let totalPricePnl = 0
    let totalFundingPnl = 0
    let totalAdjMargin = 0
    for (const r of pf.computed) {
      const p = r.position
      const price = r.unrealizedPnl ?? 0
      const f = funding.fundingByPositionId[p.id]?.totalFundingPnL ?? 0
      const adj = adjustedMargin(p, f)
      totalPricePnl += Number.isFinite(price) ? price : 0
      totalFundingPnl += Number.isFinite(f) ? f : 0
      totalAdjMargin += Number.isFinite(adj) && adj > 0 ? adj : 0
    }
    const totalPnL = totalPricePnl + totalFundingPnl
    const roe = totalAdjMargin > 0 ? (totalPnL / totalAdjMargin) * 100 : null
    return { totalPnL, roe, totalPricePnl, totalFundingPnl, totalAdjMargin }
  }, [pf.computed, funding.fundingByPositionId])

  const pnl = totalsWithFunding.totalPnL
  const roe = totalsWithFunding.roe
  const tone = getPnlIntensityClass(roe)

  const summary = useMemo(() => {
    return [
      { label: 'Total margin', value: formatPrice(totalsWithFunding.totalAdjMargin, 'crypto'), tone: 'text-bx-primary' },
      {
        label: 'Unrealized PnL',
        value: formatPriceSigned(pnl, 'crypto'),
        tone,
        sub: `Price ${formatPriceSigned(totalsWithFunding.totalPricePnl, 'crypto')} · Funding ${formatPriceSigned(totalsWithFunding.totalFundingPnl, 'crypto')}`,
      },
      { label: 'Total ROE', value: roe == null ? '—' : fmtSignedPct(roe), tone },
    ]
  }, [formatPrice, formatPriceSigned, totalsWithFunding.totalAdjMargin, totalsWithFunding.totalFundingPnl, totalsWithFunding.totalPricePnl, pnl, roe, tone])

  const bxLastSync = useMemo(() => {
    if (!bx.state.lastSyncedAt) return null
    const sec = Math.max(0, Math.floor((Date.now() - bx.state.lastSyncedAt) / 1000))
    if (sec <= 5) return null
    if (sec < 60) return `${sec}s ago`
    const m = Math.floor(sec / 60)
    return `${m}m ago`
  }, [bx.state.lastSyncedAt])

  useEffect(() => {
    // Map Binance positionRisk -> synced positions (read-only)
    const raw = bx.state.rawPositions
    if (!Array.isArray(raw)) return
    const positions = (raw as any[])
      .filter((p) => p && typeof p.symbol === 'string')
      .map((p) => {
        const symbol = String(p.symbol).trim().toUpperCase()
        const amt = Number(String(p.positionAmt ?? '').trim())
        const entry = Number(String(p.entryPrice ?? '').trim())
        const lev = Number(String(p.leverage ?? '').trim())
        const isoMargin = Number(String(p.isolatedMargin ?? '').trim())
        const marginType = typeof p.marginType === 'string' ? String(p.marginType).toLowerCase() : ''
        if (!symbol || !Number.isFinite(amt) || amt === 0) return null
        if (!Number.isFinite(entry) || entry <= 0) return null
        if (!Number.isFinite(lev) || lev <= 0) return null
        const side = amt > 0 ? 'LONG' : 'SHORT'
        const quantity = Math.abs(amt)
        const notional = quantity * entry
        const margin =
          Number.isFinite(isoMargin) && isoMargin > 0 ? isoMargin : notional / lev
        const positionSide = typeof p.positionSide === 'string' ? String(p.positionSide) : 'BOTH'
        return {
          id: `bx|${symbol}|${side}|${positionSide}`,
          symbol,
          source: 'synced' as const,
          side: side as 'LONG' | 'SHORT',
          marginMode: marginType === 'isolated' ? 'isolated' : 'cross',
          initialMargin:
            marginType === 'isolated' && Number.isFinite(isoMargin) && isoMargin > 0 ? isoMargin : undefined,
          entryPrice: entry,
          margin,
          quantity,
          leverage: lev,
          createdAt: Date.now(),
        }
      })
      .filter(Boolean) as any
    const key = Array.isArray(positions) ? positions.map((p: any) => String(p?.id ?? '')).join('|') : ''
    if (key && key === lastSyncedKeyRef.current) return
    lastSyncedKeyRef.current = key
    pf.setSyncedPositions(positions)
  }, [bx.state.rawPositions, pf.setSyncedPositions])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function DragHandle({
    disabled,
    setActivatorNodeRef,
    attributes,
    listeners,
  }: {
    disabled?: boolean
    setActivatorNodeRef: (el: HTMLElement | null) => void
    attributes: DraggableAttributes
    listeners: SyntheticListenerMap | undefined
  }) {
    return (
      <button
        type="button"
        ref={setActivatorNodeRef}
        disabled={disabled}
        className="app-no-drag flex min-h-[3.25rem] w-7 shrink-0 cursor-grab touch-none items-center justify-center self-stretch text-bx-muted hover:text-bx-secondary active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Kéo để đổi thứ tự"
        {...attributes}
        {...listeners}
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <circle cx="6" cy="5" r="1.5" />
          <circle cx="14" cy="5" r="1.5" />
          <circle cx="6" cy="10" r="1.5" />
          <circle cx="14" cy="10" r="1.5" />
          <circle cx="6" cy="15" r="1.5" />
          <circle cx="14" cy="15" r="1.5" />
        </svg>
      </button>
    )
  }

  function SortableManualRow({ row }: { row: import('../hooks/usePortfolio').PositionComputed }) {
    const id = row.position.id
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
      useSortable({ id })
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : undefined,
    } as const

    return (
      <PositionRow
        row={row}
        onDelete={pf.removePosition}
        onUpdateNote={pf.updatePositionNote}
        funding={funding.fundingByPositionId[row.position.id]}
        setNodeRef={setNodeRef as any}
        style={style}
        dragHandle={
          <DragHandle
            setActivatorNodeRef={setActivatorNodeRef}
            attributes={attributes}
            listeners={listeners}
          />
        }
      />
    )
  }

  if (!pf.storageHydrated) {
    return <PortfolioSkeleton embedded={embedded} />
  }

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
            {bx.state.hasCredentials ? (
              <RefreshButton
                onClick={() => void bx.syncNow()}
                loading={bx.state.syncing}
                className="rounded-lg border border-bx-border-medium bg-bx-input px-3 py-2 text-label font-semibold text-bx-secondary hover:text-bx-primary"
                title="Refresh synced positions"
              >
                Sync
              </RefreshButton>
            ) : (
              <button
                type="button"
                className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-3 py-2 text-label font-semibold text-bx-secondary hover:text-bx-primary"
                onClick={() => setSettingsOpen(true)}
                title="Connect Binance"
              >
                Connect
              </button>
            )}
            {bx.state.hasCredentials ? (
              <div className="hidden min-[361px]:flex items-center gap-2 pr-1">
                <span
                  className={`size-1.5 rounded-full ${
                    bx.state.status === 'connected'
                      ? 'bg-bx-green'
                      : bx.state.status === 'error'
                        ? 'bg-bx-red'
                        : 'bg-bx-muted'
                  }`}
                  aria-hidden
                />
                <span
                  className={`text-[11px] ${
                    bx.state.status === 'connected' && bx.state.lastSyncedAt != null && Date.now() - bx.state.lastSyncedAt > 5 * 60_000
                      ? 'text-bx-yellow'
                      : 'text-bx-muted'
                  }`}
                  title={
                    bx.state.lastSyncedAt
                      ? `Last synced: ${new Date(bx.state.lastSyncedAt).toLocaleString()}`
                      : undefined
                  }
                >
                  {bx.state.status === 'connected'
                    ? 'Connected'
                    : bx.state.status === 'error'
                      ? 'Error'
                      : '—'}
                  {bxLastSync ? ` · ${bxLastSync}` : ''}
                </span>
              </div>
            ) : null}
            <PortfolioSettingsMenu active={active} onOpenApiSettings={() => setSettingsOpen(true)} />
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

        {bx.state.hasCredentials && bx.state.status === 'error' && bx.state.error ? (
          <div className="mt-2">
            <ErrorState
              compact
              title={binanceErrorToVi(bx.state.error).title}
              message={binanceErrorToVi(bx.state.error).message}
              onRetry={() => void bx.syncNow()}
            />
          </div>
        ) : null}

        {funding.error ? (
          <div className="mt-2">
            <ErrorState compact title="Funding" message={funding.error} onRetry={funding.retry} />
          </div>
        ) : null}

        <div
          className={`relative mt-3 grid grid-cols-3 gap-2 ${
            funding.isLoading && pf.positions.length > 0 ? 'min-h-[5.5rem]' : ''
          }`}
        >
          {summary.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-bx-base/40 app-pad-md">
              <p className="text-meta uppercase tracking-wide text-bx-muted">{s.label}</p>
              <p className={`mt-1 font-mono text-price font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
              {'sub' in s && (s as any).sub ? (
                <p
                  className={`mt-1 text-[11px] text-bx-muted ${
                    funding.isLoading && pf.positions.length > 0 ? 'opacity-40' : ''
                  }`}
                >
                  {(s as any).sub}
                </p>
              ) : null}
            </div>
          ))}
          {funding.isLoading && pf.positions.length > 0 ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-full bg-bx-border-subtle/80"
              aria-hidden
            >
              <div className="skeleton-shimmer h-full w-full rounded-full bg-bx-elevated opacity-90" />
            </div>
          ) : null}
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
          <div className="app-vstack-md">
            {pf.syncedPositions.length > 0 ? (
              <div className="app-vstack-sm">
                <p className="text-meta font-semibold uppercase tracking-wide text-bx-muted">Synced</p>
                <ul className="flex flex-col gap-2">
                  {pf.computed
                    .filter((r) => r.position.source === 'synced')
                    .map((row) => (
                      <PositionRow
                        key={row.position.id}
                        row={row}
                        onDelete={pf.removePosition}
                        funding={funding.fundingByPositionId[row.position.id]}
                      />
                    ))}
                </ul>
              </div>
            ) : null}

            {pf.manualPositions.length > 0 ? (
              <div className="app-vstack-sm">
                <p className="text-meta font-semibold uppercase tracking-wide text-bx-muted">Manual</p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e: DragEndEvent) => {
                    const over = e.over
                    if (!over) return
                    const activeId = String(e.active.id)
                    const overId = String(over.id)
                    pf.reorderManualPositions(activeId, overId)
                  }}
                >
                  <SortableContext
                    items={pf.manualPositions.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="flex flex-col gap-2">
                      {pf.computed
                        .filter((r) => r.position.source !== 'synced')
                        .map((row) => (
                          <SortableManualRow key={row.position.id} row={row} />
                        ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </div>
            ) : null}
          </div>
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

      <ApiKeySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} enabled={active} />
    </div>
  )
}

