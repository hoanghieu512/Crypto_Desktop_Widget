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
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  priceMapKey,
  useRealtimePrice,
  type FuturesMarkSnapshot,
  type Market,
  type MarketSocketSlice,
  type PriceMapEntry,
  type RealtimeConnectionStatus,
  type WatchPriceEntry,
} from '../hooks/useRealtimePrice'
import { useFormat } from '../providers/FormatProvider'
import { normalizeCryptoPairInput } from '../utils/cryptoPair'
import { FuturesSimulatorPanel } from './FuturesSimulatorPanel'
import { SessionBar } from './SessionBar'

export type WatchlistDashboardProps = {
  onConnectionStatusChange?: (status: RealtimeConnectionStatus) => void
  onPricesBySymbolChange?: (prices: Record<string, number | null>) => void
  onQuickAddAlert?: (symbolUpper: string, currentPrice: number | null) => void
}

const STORAGE_KEY = 'crypto-watchlist-v2'

/** Sau khoảng này không có tick WS → coi giá có thể cũ (UI dim) */
const PRICE_STALE_AFTER_MS = 10_000

type MarketMode = 'global' | 'perCoin'

type WatchItem = {
  id: string
  symbol: string
  /** Chỉ dùng khi marketMode === 'perCoin' */
  market?: Market
}

type StoredState = {
  v: 2
  marketMode: MarketMode
  globalMarket: Market
  items: WatchItem[]
}

function newId(): string {
  return crypto.randomUUID()
}

const DEFAULT_ITEMS: WatchItem[] = [
  { id: 'seed-btc', symbol: 'btcusdt' },
  { id: 'seed-eth', symbol: 'ethusdt' },
]

function loadState(): StoredState {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const legacy = localStorage.getItem('crypto-watchlist')
      if (legacy) raw = legacy
    }
    if (!raw) {
      return {
        v: 2,
        marketMode: 'global',
        globalMarket: 'spot',
        items: DEFAULT_ITEMS.map((x) => ({ ...x, id: newId() })),
      }
    }
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      const symbols = parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      return {
        v: 2,
        marketMode: 'global',
        globalMarket: 'spot',
        items: symbols.map((s) => ({
          id: newId(),
          symbol: normalizeCryptoPairInput(s),
        })),
      }
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as StoredState).v === 2 &&
      Array.isArray((parsed as StoredState).items)
    ) {
      const s = parsed as StoredState
      return {
        v: 2,
        marketMode: s.marketMode === 'perCoin' ? 'perCoin' : 'global',
        globalMarket: s.globalMarket === 'futures' ? 'futures' : 'spot',
        items: s.items
          .filter((i) => i && typeof i.symbol === 'string' && i.symbol.trim().length > 0)
          .map((i) => ({
            id: typeof i.id === 'string' ? i.id : newId(),
            symbol: normalizeCryptoPairInput(i.symbol),
            market: i.market === 'futures' || i.market === 'spot' ? i.market : undefined,
          })),
      }
    }
  } catch {
    /* ignore */
  }
  return {
    v: 2,
    marketMode: 'global',
    globalMarket: 'spot',
    items: DEFAULT_ITEMS.map((x) => ({ ...x, id: newId() })),
  }
}

function effectiveMarket(
  item: WatchItem,
  mode: MarketMode,
  globalMarket: Market,
): Market {
  if (mode === 'global') return globalMarket
  return item.market ?? 'spot'
}

function formatFundingRate(r: string): string {
  const n = Number(r)
  if (!Number.isFinite(n)) return r
  return `${(n * 100).toFixed(4)}%`
}

function basisHint(
  symbolLower: string,
  market: Market,
  prices: Readonly<Record<string, PriceMapEntry>>,
): string | null {
  const spot = prices[priceMapKey(symbolLower, 'spot')]
  const fut = prices[priceMapKey(symbolLower, 'futures')]
  if (!spot || spot.market !== 'spot' || !fut || fut.market !== 'futures') return null
  const ps = Number(spot.snapshot.lastPrice)
  const fm = Number(fut.snapshot.markPrice)
  if (!Number.isFinite(ps) || !Number.isFinite(fm) || ps === 0) return null
  const diffPct = ((fm - ps) / ps) * 100
  const sign = diffPct >= 0 ? '+' : ''
  if (market === 'futures') {
    return `So với spot: ${sign}${diffPct.toFixed(3)}% (mark − spot)`
  }
  return `So với mark futures: ${sign}${diffPct.toFixed(3)}%`
}

function CryptoAmount({
  raw,
  className = '',
  transitionClass = '',
}: {
  raw: string
  className?: string
  /** Thêm transition khi số đổi (crypto) */
  transitionClass?: string
}) {
  const { formatPrice } = useFormat()
  const n = Number(raw)
  if (!Number.isFinite(n)) return <span className={`${className} ${transitionClass}`.trim()}>{raw}</span>
  return (
    <span className={`font-price ${className} ${transitionClass}`.trim()}>
      {formatPrice(n, 'crypto')}
    </span>
  )
}

function FundingEta({ ts }: { ts: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [ts])

  const left = Math.max(0, ts - now)
  const h = Math.floor(left / 3_600_000)
  const m = Math.floor((left % 3_600_000) / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    <span className="font-mono text-[10px] text-bx-muted">
      {left <= 0 ? 'Đang chờ block…' : `${pad(h)}:${pad(m)}:${pad(s)}`}
    </span>
  )
}

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

const FLOAT_GAP_PX = 8
const FLOAT_SNAP_THRESHOLD_PX = 20
const FLOAT_EST_H = 440

function floatPanelWidth(rootW: number): number {
  return Math.max(0, rootW - FLOAT_GAP_PX * 2)
}

type FuturesSimulatorSession = {
  itemId: string
  symbolUpper: string
}

function snapFloatPanel(
  left: number,
  top: number,
  panelW: number,
  panelH: number,
  rootW: number,
  rootH: number,
): { left: number; top: number } {
  const G = FLOAT_GAP_PX
  const T = FLOAT_SNAP_THRESHOLD_PX
  const snapRight = rootW - panelW - G
  const snapLeft = G
  const snapTop = G
  const snapBottom = rootH - panelH - G
  const snapMidY = (rootH - panelH) / 2

  let l = left
  let t = top

  if (Math.abs(l - snapRight) <= T) l = snapRight
  else if (Math.abs(l - snapLeft) <= T) l = snapLeft

  if (Math.abs(t - snapTop) <= T) t = snapTop
  else if (Math.abs(t - snapBottom) <= T) t = snapBottom
  else if (Math.abs(t - snapMidY) <= T) t = snapMidY

  l = Math.max(G, Math.min(l, rootW - panelW - G))
  t = Math.max(G, Math.min(t, rootH - panelH - G))
  return { left: l, top: t }
}

function layoutSnapRight(rootW: number, rootH: number, panelW: number, panelH: number) {
  const G = FLOAT_GAP_PX
  const left = rootW - panelW - G
  const top = Math.max(G, Math.min((rootH - panelH) / 2, rootH - panelH - G))
  return { left, top, width: panelW }
}

function clampFloatPos(
  left: number,
  top: number,
  panelW: number,
  panelH: number,
  rootW: number,
  rootH: number,
) {
  const G = FLOAT_GAP_PX
  return {
    left: Math.max(G, Math.min(left, rootW - panelW - G)),
    top: Math.max(G, Math.min(top, rootH - panelH - G)),
    width: panelW,
  }
}

function WatchlistColumnHeader() {
  const cell = 'text-[10px] font-medium uppercase tracking-[0.06em] text-bx-muted'
  return (
    <div
      className="flex shrink-0 items-start gap-1.5 border-b border-bx-border-subtle bg-bx-header-row px-3 py-1.5 max-[299px]:px-2"
      role="row"
    >
      <div className="w-7 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className={`min-w-0 truncate ${cell}`}>Symbol</div>
          <div className={`shrink-0 text-right ${cell}`}>Giá</div>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className={`min-w-0 truncate ${cell}`}>Loại</div>
          <div className={`shrink-0 text-right ${cell}`}>Δ24h / Fund</div>
        </div>
      </div>
      <div className="w-8 shrink-0" aria-hidden />
      <div className="w-[76px] shrink-0" aria-hidden />
    </div>
  )
}

function WatchlistSocketLine({
  label,
  slice,
}: {
  label: string
  slice: MarketSocketSlice
}) {
  if (slice.streams.length === 0) return null
  const ok = slice.status === 'open'
  const warn =
    slice.status === 'reconnecting' ||
    slice.status === 'connecting' ||
    slice.status === 'closed'
  const dot = ok ? 'bg-bx-green' : warn ? 'bg-bx-yellow' : 'bg-bx-muted'
  const statusText = ok
    ? 'OK'
    : slice.status === 'reconnecting'
      ? 'tái kết nối'
      : slice.status
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 text-[11px] text-bx-secondary max-[299px]:min-w-0 max-[299px]:truncate"
      title={slice.lastError ?? undefined}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      {label}: {statusText}
    </span>
  )
}

function WatchlistStatusBar({
  spot,
  futures,
}: {
  spot: MarketSocketSlice
  futures: MarketSocketSlice
}) {
  if (spot.streams.length === 0 && futures.streams.length === 0) return null
  return (
    <div
      className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-bx-border-subtle bg-bx-base px-4 py-1.5 max-[299px]:gap-x-2 max-[299px]:px-3"
      role="status"
    >
      <WatchlistSocketLine label="Spot" slice={spot} />
      <WatchlistSocketLine label="Futures" slice={futures} />
    </div>
  )
}

function pctClass(n: number): string {
  if (!Number.isFinite(n)) return 'text-bx-muted'
  if (n > 0) return 'text-bx-green'
  if (n < 0) return 'text-bx-red'
  return 'text-bx-muted'
}

function fmtSignedPct(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

type RowProps = {
  item: WatchItem
  market: Market
  mode: MarketMode
  entry: PriceMapEntry | undefined
  prices: Readonly<Record<string, PriceMapEntry>>
  /** ms từ Date.now() — dùng chung một tick để tính stale, tránh mỗi dòng một interval */
  stalenessClock: number
  onRemove: (id: string) => void
  onToggleRowMarket: (id: string) => void
  dragDisabled?: boolean
  onOpenFuturesSimulator?: (detail: { itemId: string; symbolUpper: string }) => void
  onQuickAddAlert?: (symbolUpper: string, currentPrice: number | null) => void
}

const badgeBase = 'rounded px-1 py-0.5 text-[9px] font-semibold leading-none sm:px-1.5 sm:text-[10px]'

const actionBtnClass =
  'app-no-drag shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-bx-elevated text-bx-secondary transition-colors duration-[120ms] hover:text-bx-primary sm:px-2 sm:text-[11px]'

function spotDeltaPercent(
  symbolLower: string,
  prices: Readonly<Record<string, PriceMapEntry>>,
): number | null {
  const e = prices[priceMapKey(symbolLower, 'spot')]
  if (!e || e.market !== 'spot') return null
  const n = Number(e.snapshot.priceChangePercent)
  return Number.isFinite(n) ? n : null
}

const WatchlistRow = memo(function WatchlistRow({
  item,
  market,
  mode,
  entry,
  prices,
  stalenessClock,
  onRemove,
  onToggleRowMarket,
  dragDisabled,
  onOpenFuturesSimulator,
  onQuickAddAlert,
}: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: Boolean(dragDisabled) })

  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : undefined,
    zIndex: isDragging ? 40 : undefined,
  }

  const sym = item.symbol.trim().toLowerCase()
  const display = item.symbol.trim().toUpperCase()
  const hint = basisHint(sym, market, prices)
  const curPrice =
    entry?.market === 'spot'
      ? Number(entry.snapshot.lastPrice)
      : entry?.market === 'futures'
        ? Number((entry.snapshot as FuturesMarkSnapshot).markPrice)
        : Number.NaN
  const curPriceSafe = Number.isFinite(curPrice) && curPrice > 0 ? curPrice : null

  const alertCol = (
    <div className="w-8 shrink-0 self-center flex items-center justify-center">
      {onQuickAddAlert ? (
        <button
          type="button"
          className="app-no-drag rounded-md px-1.5 py-1 text-[12px] text-bx-secondary hover:bg-bx-elevated hover:text-bx-primary"
          title="Set alert"
          onClick={(e) => {
            e.stopPropagation()
            onQuickAddAlert(display, curPriceSafe)
          }}
          aria-label={`Set alert for ${display}`}
        >
          🔔
        </button>
      ) : null}
    </div>
  )

  const priceStale =
    entry != null && stalenessClock - entry.lastUpdated > PRICE_STALE_AFTER_MS
  const priceTransition = 'transition-[color,opacity] duration-300 ease-out'

  const rowHover =
    'border-b border-bx-border-subtle transition-[background-color] duration-[120ms] hover:bg-bx-surface/60'

  const symbolBadges =
    market === 'futures' ? (
      <>
        <span className={`${badgeBase} bg-bx-fut-badge-bg text-bx-purple`}>FUT</span>
        <span className={`${badgeBase} border border-bx-mark-border bg-transparent text-bx-mark-text`}>
          MARK
        </span>
      </>
    ) : (
      <>
        <span className={`${badgeBase} bg-bx-spot-badge-bg text-bx-spot-blue`}>SPOT</span>
        <span className={`${badgeBase} border border-bx-last-border bg-transparent text-bx-last-text`}>
          LAST
        </span>
      </>
    )

  const actionsCol = (
    <div className="flex w-[76px] shrink-0 items-center justify-end gap-0.5 self-center sm:w-[80px] sm:gap-1">
      {mode === 'perCoin' ? (
        <button
          type="button"
          className={actionBtnClass}
          title="Đổi Spot / Futures cho dòng này"
          onClick={(e) => {
            e.stopPropagation()
            onToggleRowMarket(item.id)
          }}
        >
          {market === 'spot' ? 'FUT' : 'SPOT'}
        </button>
      ) : null}
      <button
        type="button"
        className={actionBtnClass}
        aria-label={`Xóa ${display}`}
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item.id)
        }}
      >
        Xóa
      </button>
    </div>
  )

  const handle = (
    <DragHandle
      disabled={dragDisabled}
      setActivatorNodeRef={setActivatorNodeRef}
      attributes={attributes}
      listeners={listeners}
    />
  )

  const priceFlashKey =
    entry?.market === 'spot'
      ? entry.snapshot.lastPrice
      : entry?.market === 'futures'
        ? entry.snapshot.markPrice
        : null
  const [priceFlash, setPriceFlash] = useState(false)
  const [priceFlashDir, setPriceFlashDir] = useState<'up' | 'down' | null>(null)
  const prevFlashKey = useRef<string | null>(null)
  const prevFlashNum = useRef<number | null>(null)
  useEffect(() => {
    if (priceFlashKey == null) {
      prevFlashKey.current = null
      prevFlashNum.current = null
      return
    }
    if (prevFlashKey.current != null && prevFlashKey.current !== priceFlashKey) {
      const cur = Number(priceFlashKey)
      const prev = prevFlashNum.current
      if (Number.isFinite(cur) && prev != null && Number.isFinite(prev)) {
        if (cur > prev) setPriceFlashDir('up')
        else if (cur < prev) setPriceFlashDir('down')
        else setPriceFlashDir(null)
      } else {
        setPriceFlashDir(null)
      }
      setPriceFlash(true)
      const t = window.setTimeout(() => setPriceFlash(false), 480)
      prevFlashKey.current = priceFlashKey
      prevFlashNum.current = Number.isFinite(cur) ? cur : prevFlashNum.current
      return () => clearTimeout(t)
    }
    prevFlashKey.current = priceFlashKey
    {
      const cur = Number(priceFlashKey)
      if (Number.isFinite(cur)) prevFlashNum.current = cur
    }
  }, [priceFlashKey])

  const rowShell = (body: ReactNode) => (
    <li ref={setNodeRef} style={sortableStyle} className="list-none">
      <div
        className={`flex min-w-0 items-start gap-1.5 px-3 py-1.5 max-[299px]:px-2 max-[299px]:py-1 ${rowHover}`}
      >
        {handle}
        {body}
        {alertCol}
        {actionsCol}
      </div>
    </li>
  )

  const coreCell = (interactive: boolean, inner: React.ReactNode) => {
    if (interactive && onOpenFuturesSimulator) {
      return (
        <div
          role="button"
          tabIndex={0}
          className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 outline-none focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:ring-inset"
          title="Mở Futures Simulator"
          onClick={(e) => {
            const el = e.target as HTMLElement
            if (el.closest('button')) return
            onOpenFuturesSimulator({
              itemId: item.id,
              symbolUpper: display,
            })
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            onOpenFuturesSimulator({
              itemId: item.id,
              symbolUpper: display,
            })
          }}
        >
          {inner}
        </div>
      )
    }
    return <div className="flex min-w-0 flex-1 flex-col gap-0.5">{inner}</div>
  }

  if (!entry) {
    return rowShell(
      coreCell(false, (
        <>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span title={hint ?? undefined} className="truncate text-[13px] font-semibold text-bx-primary">
              {display}
            </span>
            <span className="shrink-0 font-price text-[15px] tabular-nums text-bx-muted">…</span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="flex min-w-0 flex-wrap items-center gap-1">{symbolBadges}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-bx-muted">—</span>
          </div>
        </>
      )),
    )
  }

  if (entry.market === 'spot') {
    const price = entry.snapshot
    const pct = Number(price.priceChangePercent)
    const lastN = Number(price.lastPrice)
    return rowShell(
      coreCell(false, (
        <>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span title={hint ?? undefined} className="truncate text-[13px] font-semibold text-bx-primary">
              {display}
            </span>
            <div
              className={`min-w-0 max-w-[55%] shrink-0 rounded-sm text-right cursor-pointer transition-[filter,color,opacity] duration-[120ms] hover:brightness-110 ${
                priceStale ? 'opacity-50 ' : ''
              }${priceFlash ? (priceFlashDir === 'up' ? 'app-price-flash-up ' : priceFlashDir === 'down' ? 'app-price-flash-down ' : 'animate-price-flash ') : ''}${priceTransition}`.trim()}
              title="Giá realtime"
            >
              {Number.isFinite(lastN) ? (
                <CryptoAmount
                  raw={price.lastPrice}
                  className="font-price text-[15px] text-bx-primary"
                  transitionClass={priceTransition}
                />
              ) : (
                <span className="font-price text-[15px] text-bx-muted">—</span>
              )}
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="flex min-w-0 flex-wrap items-center gap-1">{symbolBadges}</span>
            <span className={`shrink-0 text-[11px] font-medium tabular-nums ${pctClass(pct)}`}>
              {fmtSignedPct(pct)}
            </span>
          </div>
        </>
      )),
    )
  }

  const f: FuturesMarkSnapshot = entry.snapshot
  const fr = Number(f.fundingRate)
  const frClass =
    !Number.isFinite(fr) ? 'text-bx-muted' : fr >= 0 ? 'text-bx-green' : 'text-bx-red'
  const markN = Number(f.markPrice)
  const spotPct = spotDeltaPercent(sym, prices)
  const line2Right =
    spotPct != null ? (
      <span className={`shrink-0 text-[11px] font-medium tabular-nums ${pctClass(spotPct)}`}>
        {fmtSignedPct(spotPct)}
      </span>
    ) : (
      <span className={`shrink-0 text-[11px] font-medium tabular-nums ${frClass}`} title="Funding">
        {formatFundingRate(f.fundingRate)}
      </span>
    )

  return rowShell(
    coreCell(true, (
      <>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span title={hint ?? undefined} className="truncate text-[13px] font-semibold text-bx-primary">
            {display}
          </span>
          <div
            className={`min-w-0 max-w-[55%] shrink-0 rounded-sm text-right cursor-pointer transition-[filter,color,opacity] duration-[120ms] hover:brightness-110 ${
              priceStale ? 'opacity-50 ' : ''
            }${priceFlash ? (priceFlashDir === 'up' ? 'app-price-flash-up ' : priceFlashDir === 'down' ? 'app-price-flash-down ' : 'animate-price-flash ') : ''}${priceTransition}`.trim()}
            title="Giá realtime"
          >
            {Number.isFinite(markN) ? (
              <CryptoAmount
                raw={f.markPrice}
                className="font-price text-[15px] text-bx-primary"
                transitionClass={priceTransition}
              />
            ) : (
              <span className="font-price text-[15px] text-bx-muted">—</span>
            )}
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 flex-wrap items-center gap-1">{symbolBadges}</span>
          <div className="flex min-w-0 flex-col items-end gap-0 leading-tight">
            {line2Right}
            <FundingEta ts={f.nextFundingTime} />
          </div>
        </div>
      </>
    )),
  )
})


export function WatchlistDashboard({
  onConnectionStatusChange,
  onPricesBySymbolChange,
  onQuickAddAlert,
}: WatchlistDashboardProps = {}) {
  const initial = useMemo(() => loadState(), [])
  const [marketMode, setMarketMode] = useState<MarketMode>(initial.marketMode)
  const [globalMarket, setGlobalMarket] = useState<Market>(initial.globalMarket)
  const [items, setItems] = useState<WatchItem[]>(initial.items)
  const [draft, setDraft] = useState('sol')
  const [draftMarket, setDraftMarket] = useState<Market>('spot')
  const [stalenessClock, setStalenessClock] = useState(() => Date.now())

  const sortableIds = useMemo(() => items.map((i) => i.id), [items])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id)
      const newIndex = prev.findIndex((i) => i.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

  useEffect(() => {
    const payload: StoredState = {
      v: 2,
      marketMode,
      globalMarket,
      items: items.map((i) => ({
        id: i.id,
        symbol: i.symbol,
        ...(marketMode === 'perCoin' ? { market: i.market ?? 'spot' } : {}),
      })),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [items, marketMode, globalMarket])

  /** Thứ tự mảng chỉ ảnh hưởng UI; hook gom symbol theo tập đã sort — không reconnect WS khi reorder */
  const watchEntries: WatchPriceEntry[] = useMemo(
    () =>
      items.map((i) => ({
        key: i.id,
        symbol: normalizeCryptoPairInput(i.symbol) || i.symbol.trim().toLowerCase(),
        market: effectiveMarket(i, marketMode, globalMarket),
      })),
    [items, marketMode, globalMarket],
  )

  const { prices, loading, connectionStatus, spot, futures } =
    useRealtimePrice(watchEntries)

  useEffect(() => {
    onConnectionStatusChange?.(connectionStatus)
  }, [connectionStatus, onConnectionStatusChange])

  useEffect(() => {
    if (!onPricesBySymbolChange) return
    const out: Record<string, number | null> = {}
    for (const item of items) {
      const symLower = normalizeCryptoPairInput(item.symbol) || item.symbol.trim().toLowerCase()
      const upper = symLower.toUpperCase()
      const s = prices[priceMapKey(symLower, 'spot')]
      const f = prices[priceMapKey(symLower, 'futures')]
      const spotLast = s?.market === 'spot' ? Number(s.snapshot.lastPrice) : Number.NaN
      const futMark = f?.market === 'futures' ? Number(f.snapshot.markPrice) : Number.NaN
      const v =
        Number.isFinite(spotLast) && spotLast > 0
          ? spotLast
          : Number.isFinite(futMark) && futMark > 0
            ? futMark
            : null
      out[upper] = v
    }
    onPricesBySymbolChange(out)
  }, [items, prices, onPricesBySymbolChange])

  useEffect(() => {
    const id = window.setInterval(() => setStalenessClock(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const toggleRowMarket = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x
        const m = x.market ?? 'spot'
        return { ...x, market: m === 'spot' ? 'futures' : 'spot' }
      }),
    )
  }, [])

  const add = useCallback(() => {
    const sym = normalizeCryptoPairInput(draft)
    if (!sym) return
    const targetMarket = marketMode === 'global' ? globalMarket : draftMarket
    setItems((prev) => {
      if (
        prev.some(
          (i) =>
            normalizeCryptoPairInput(i.symbol) === sym &&
            effectiveMarket(i, marketMode, globalMarket) === targetMarket,
        )
      ) {
        return prev
      }
      const item: WatchItem = {
        id: newId(),
        symbol: sym,
        ...(marketMode === 'perCoin' ? { market: draftMarket } : {}),
      }
      return [...prev, item]
    })
    setDraft('')
  }, [draft, draftMarket, globalMarket, marketMode])

  const rootRef = useRef<HTMLDivElement>(null)
  const simulatorCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [simulatorSession, setSimulatorSession] = useState<FuturesSimulatorSession | null>(null)
  const [panelEnter, setPanelEnter] = useState(false)
  const [floatPanelPos, setFloatPanelPos] = useState({ left: 0, top: 0, width: 320 })
  const [floatDragging, setFloatDragging] = useState(false)
  const floatPreferSnapRightRef = useRef(true)
  const floatPanelBodyRef = useRef<HTMLDivElement>(null)
  const floatDragHandleRef = useRef<HTMLDivElement>(null)
  const floatDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originLeft: number
    originTop: number
  } | null>(null)

  /** Đồng bộ với simulatorSession — dùng cho aria / props */
  const isSimulatorOpen = simulatorSession != null
  const selectedSymbol = simulatorSession?.symbolUpper ?? null

  const closeFuturesSimulator = useCallback(() => {
    setPanelEnter(false)
    if (simulatorCloseTimerRef.current != null) {
      clearTimeout(simulatorCloseTimerRef.current)
      simulatorCloseTimerRef.current = null
    }
    simulatorCloseTimerRef.current = window.setTimeout(() => {
      simulatorCloseTimerRef.current = null
      setSimulatorSession(null)
    }, 150)
  }, [])

  const openFuturesSimulator = useCallback((detail: { itemId: string; symbolUpper: string }) => {
    if (simulatorCloseTimerRef.current != null) {
      clearTimeout(simulatorCloseTimerRef.current)
      simulatorCloseTimerRef.current = null
    }
    floatPreferSnapRightRef.current = true
    setSimulatorSession({
      itemId: detail.itemId,
      symbolUpper: detail.symbolUpper,
    })
  }, [])

  useEffect(() => {
    return () => {
      if (simulatorCloseTimerRef.current != null) {
        clearTimeout(simulatorCloseTimerRef.current)
        simulatorCloseTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isSimulatorOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFuturesSimulator()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isSimulatorOpen, closeFuturesSimulator])

  useEffect(() => {
    if (!simulatorSession) return
    let rafOpen: number | undefined
    const rafReset = requestAnimationFrame(() => {
      setPanelEnter(false)
      rafOpen = requestAnimationFrame(() => setPanelEnter(true))
    })
    return () => {
      cancelAnimationFrame(rafReset)
      if (rafOpen != null) cancelAnimationFrame(rafOpen)
    }
  }, [simulatorSession])

  const simResolved = useMemo(() => {
    if (!simulatorSession) {
      return { symLower: '', pk: '', mark: 0 as number, symbolKey: '' }
    }
    const item = items.find((i) => i.id === simulatorSession.itemId)
    const symLower = item
      ? normalizeCryptoPairInput(item.symbol) || item.symbol.trim().toLowerCase()
      : ''
    const pk = priceMapKey(symLower, 'futures')
    const fe = prices[pk]
    const mark =
      fe?.market === 'futures' ? parseFloat(fe.snapshot.markPrice) : Number.NaN
    return {
      symLower,
      pk,
      mark: Number.isFinite(mark) ? mark : 0,
      symbolKey: `${simulatorSession.itemId}|${pk}`,
    }
  }, [simulatorSession, items, prices])

  const floatPanelPosRef = useRef(floatPanelPos)

  useLayoutEffect(() => {
    floatPanelPosRef.current = floatPanelPos
  }, [floatPanelPos])

  const applyFloatSnapLayout = useCallback(() => {
    const rootEl = rootRef.current
    const bodyEl = floatPanelBodyRef.current
    if (!rootEl) return
    const root = rootEl.getBoundingClientRect()
    const panelW = floatPanelWidth(root.width)
    const panelH = bodyEl?.offsetHeight ?? FLOAT_EST_H
    if (floatPreferSnapRightRef.current && !floatDragging) {
      setFloatPanelPos(layoutSnapRight(root.width, root.height, panelW, panelH))
    } else {
      setFloatPanelPos((p) =>
        clampFloatPos(p.left, p.top, panelW, panelH, root.width, root.height),
      )
    }
  }, [floatDragging])

  useLayoutEffect(() => {
    if (!simulatorSession || !rootRef.current) return
    applyFloatSnapLayout()
    window.addEventListener('resize', applyFloatSnapLayout)
    let ro: ResizeObserver | null = null
    const tryObserve = () => {
      const body = floatPanelBodyRef.current
      if (!body || ro || typeof ResizeObserver === 'undefined') return
      ro = new ResizeObserver(() => applyFloatSnapLayout())
      ro.observe(body)
    }
    tryObserve()
    const raf = requestAnimationFrame(tryObserve)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', applyFloatSnapLayout)
      ro?.disconnect()
    }
  }, [simulatorSession, floatDragging, panelEnter, simResolved.mark, applyFloatSnapLayout])

  const endFloatDrag = useCallback(() => {
    const d = floatDragRef.current
    floatDragRef.current = null
    setFloatDragging(false)
    if (d?.pointerId != null && floatDragHandleRef.current) {
      try {
        floatDragHandleRef.current.releasePointerCapture(d.pointerId)
      } catch {
        /* already released */
      }
    }
    const rootEl = rootRef.current
    const bodyEl = floatPanelBodyRef.current
    if (!rootEl) return
    const root = rootEl.getBoundingClientRect()
    const panelW = floatPanelWidth(root.width)
    const panelH = bodyEl?.offsetHeight ?? FLOAT_EST_H
    setFloatPanelPos((p) => {
      const snapped = snapFloatPanel(p.left, p.top, panelW, panelH, root.width, root.height)
      return { left: snapped.left, top: snapped.top, width: panelW }
    })
  }, [])

  useEffect(() => {
    if (!floatDragging) return
    const onMove = (e: PointerEvent) => {
      const d = floatDragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const rootEl = rootRef.current
      if (!rootEl) return
      const root = rootEl.getBoundingClientRect()
      const panelW = floatPanelWidth(root.width)
      const panelH = floatPanelBodyRef.current?.offsetHeight ?? FLOAT_EST_H
      const nl = d.originLeft + (e.clientX - d.startX)
      const nt = d.originTop + (e.clientY - d.startY)
      setFloatPanelPos(
        clampFloatPos(nl, nt, panelW, panelH, root.width, root.height),
      )
    }
    const onUp = (e: PointerEvent) => {
      const d = floatDragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      endFloatDrag()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [floatDragging, endFloatDrag])

  const onFloatDragStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    floatPreferSnapRightRef.current = false
    const pr = floatPanelPosRef.current
    floatDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: pr.left,
      originTop: pr.top,
    }
    setFloatDragging(true)
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const segWrap =
    'inline-flex shrink-0 flex-wrap rounded-md border border-bx-border-medium bg-bx-input p-0.5 max-[299px]:p-px'
  const segBtn =
    'shrink-0 rounded px-2 py-0.5 text-[11px] font-medium transition-colors duration-150 max-[299px]:px-1.5 max-[299px]:py-0.5 max-[299px]:text-[10px]'
  const segBtnOn = 'bg-bx-border-medium text-bx-primary'
  const segBtnOff = 'text-bx-secondary hover:text-bx-primary'

  return (
    <div
      ref={rootRef}
      className="app-no-drag relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bx-base"
    >
      <div
        className={`flex min-h-0 flex-1 flex-col overscroll-contain ${
          isSimulatorOpen ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        <div className="shrink-0 border-b border-bx-border-subtle bg-bx-surface px-3 py-2 max-[299px]:px-2 max-[299px]:py-1.5 min-[361px]:px-4 min-[361px]:py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
            className="flex flex-col gap-2 max-[299px]:gap-1.5"
          >
            <div className="flex flex-wrap items-center gap-2 max-[299px]:gap-1.5">
              <div className={segWrap} role="group" aria-label="Phạm vi danh sách">
                <button
                  type="button"
                  className={`${segBtn} ${marketMode === 'global' ? segBtnOn : segBtnOff}`}
                  title="Áp dụng Spot/Futures cho cả danh sách"
                  onClick={() => setMarketMode('global')}
                >
                  Chung
                </button>
                <button
                  type="button"
                  className={`${segBtn} ${marketMode === 'perCoin' ? segBtnOn : segBtnOff}`}
                  title="Mỗi coin chọn Spot hoặc Futures riêng"
                  onClick={() => setMarketMode('perCoin')}
                >
                  Từng coin
                </button>
              </div>
              {marketMode === 'global' ? (
                <div className={segWrap} role="group" aria-label="Thị trường áp dụng">
                  <button
                    type="button"
                    className={`${segBtn} ${globalMarket === 'spot' ? segBtnOn : segBtnOff}`}
                    onClick={() => setGlobalMarket('spot')}
                  >
                    Spot
                  </button>
                  <button
                    type="button"
                    className={`${segBtn} ${globalMarket === 'futures' ? segBtnOn : segBtnOff}`}
                    title="Giá mark futures"
                    onClick={() => setGlobalMarket('futures')}
                  >
                    Futures
                  </button>
                </div>
              ) : (
                <div className={segWrap} role="group" aria-label="Loại cho coin mới">
                  <button
                    type="button"
                    className={`${segBtn} ${draftMarket === 'spot' ? segBtnOn : segBtnOff}`}
                    onClick={() => setDraftMarket('spot')}
                  >
                    Spot
                  </button>
                  <button
                    type="button"
                    className={`${segBtn} ${draftMarket === 'futures' ? segBtnOn : segBtnOff}`}
                    title="Giá mark futures"
                    onClick={() => setDraftMarket('futures')}
                  >
                    Futures
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-meta tracking-tight text-bx-muted">BTC → BTCUSDT</span>
              <span className="text-meta text-bx-muted">Chọn Spot/Futures trước khi thêm</span>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <div className="relative min-h-[2.25rem] min-w-0 flex-1">
                <svg
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-bx-muted max-[299px]:left-2 max-[299px]:size-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  id="wl-symbol-input"
                  className="app-no-drag h-full min-h-[2.25rem] w-full min-w-0 rounded-md border border-bx-border-medium bg-bx-input py-1.5 pl-8 pr-2 font-mono text-xs text-bx-primary outline-none ring-0 focus:border-bx-border-medium focus:ring-1 focus:ring-white/10 focus:ring-inset max-[299px]:min-h-9 max-[299px]:pl-7 max-[299px]:text-[11px]"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    const n = normalizeCryptoPairInput(draft)
                    if (n) setDraft(n)
                  }}
                  placeholder="btc / btcusdt"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Mã cặp"
                />
              </div>
              <button
                type="submit"
                className="app-no-drag shrink-0 rounded-md bg-bx-yellow px-3 py-2 text-xs font-semibold text-bx-add-fg transition-opacity hover:opacity-95 max-[299px]:px-2.5 max-[299px]:py-1.5 max-[299px]:text-[11px]"
              >
                Thêm
              </button>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <SessionBar />
              {loading && watchEntries.length > 0 ? (
                <span className="truncate text-meta text-bx-muted">Đang tải…</span>
              ) : null}
            </div>
          </form>
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {connectionStatus === 'reconnecting' && items.length > 0 ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-2 pt-1"
              role="status"
            >
              <div className="flex min-w-0 max-w-[min(100%,280px)] items-center gap-2 rounded-full border border-bx-border-medium bg-bx-elevated/95 px-3 py-1 text-[10px] font-medium text-bx-yellow shadow-md backdrop-blur-sm">
                <span
                  className="inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-bx-yellow/50 border-t-transparent"
                  aria-hidden
                />
                <span className="min-w-0 truncate">Đang kết nối lại…</span>
              </div>
            </div>
          ) : null}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <WatchlistColumnHeader />
              <ul className="flex min-h-0 flex-1 flex-col">
                {items.length === 0 ? (
                  <li className="list-none border-b border-bx-border-subtle px-3 py-6 text-center text-[12px] text-bx-secondary">
                    Thêm cặp để xem giá realtime.
                  </li>
                ) : (
                  items.map((item) => {
                    const m = effectiveMarket(item, marketMode, globalMarket)
                    const sym =
                      normalizeCryptoPairInput(item.symbol) || item.symbol.trim().toLowerCase()
                    const pk = priceMapKey(sym, m)
                    const entry = prices[pk]
                    return (
                      <WatchlistRow
                        key={item.id}
                        item={item}
                        market={m}
                        mode={marketMode}
                        entry={entry}
                        prices={prices}
                        stalenessClock={stalenessClock}
                        onRemove={remove}
                        onToggleRowMarket={toggleRowMarket}
                        dragDisabled={loading}
                        onOpenFuturesSimulator={
                          m === 'futures' ? openFuturesSimulator : undefined
                        }
                    onQuickAddAlert={onQuickAddAlert}
                      />
                    )
                  })
                )}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <WatchlistStatusBar spot={spot} futures={futures} />

      {isSimulatorOpen && simulatorSession ? (
        <div
          className="pointer-events-auto absolute inset-0 z-[200] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label={`Futures Simulator${selectedSymbol ? ` · ${selectedSymbol}` : ''}`}
        >
          <button
            type="button"
            className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-180 ease-out ${
              panelEnter ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Đóng simulator"
            onClick={closeFuturesSimulator}
          />
          <div
            ref={floatPanelBodyRef}
            className={`absolute z-[1] flex max-h-[calc(100%-16px)] flex-col overflow-hidden overscroll-contain rounded-2xl border border-white/[0.08] bg-slate-950/98 shadow-2xl shadow-black/60 ring-1 ring-black/40 ${
              floatDragging ? '' : 'transition-[transform,opacity] duration-180 ease-out'
            }`}
            style={{
              left: floatPanelPos.left,
              top: floatPanelPos.top,
              width: floatPanelPos.width,
              opacity: panelEnter ? 1 : 0,
              transform: panelEnter
                ? 'translate3d(0,0,0) scale(1)'
                : 'translate3d(0,8px,0) scale(0.98)',
            }}
          >
            <div
              ref={floatDragHandleRef}
              className="app-no-drag flex shrink-0 cursor-grab touch-none items-center justify-center gap-1 rounded-t-2xl border-b border-white/5 bg-slate-900/90 py-2 active:cursor-grabbing"
              onPointerDown={onFloatDragStart}
              role="toolbar"
              aria-label="Kéo panel — thả gần cạnh để snap"
            >
              <span className="h-1 w-9 rounded-full bg-slate-600/90" aria-hidden />
            </div>
            <div className="min-h-0 min-w-0 overflow-hidden">
              <FuturesSimulatorPanel
                key={simulatorSession.itemId}
                symbol={simulatorSession.symbolUpper}
                currentPrice={simResolved.mark}
                symbolKey={simResolved.symbolKey}
                className="max-w-none rounded-t-none rounded-b-2xl shadow-none ring-0"
                onClose={closeFuturesSimulator}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
