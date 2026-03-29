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
import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  priceMapKey,
  useRealtimePrice,
  type FuturesMarkSnapshot,
  type Market,
  type PriceMapEntry,
  type WatchPriceEntry,
} from '../hooks/useRealtimePrice'
import { useFormat } from '../providers/FormatProvider'
import { normalizeCryptoPairInput } from '../utils/cryptoPair'
import { AssetCard } from './AssetCard'
import { SessionBar } from './SessionBar'

const STORAGE_KEY = 'crypto-watchlist-v2'

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

function CryptoAmount({ raw, className = '' }: { raw: string; className?: string }) {
  const { formatPrice } = useFormat()
  const n = Number(raw)
  if (!Number.isFinite(n)) return <span className={className}>{raw}</span>
  return <span className={className}>{formatPrice(n, 'crypto')}</span>
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
    <span className="font-mono text-slate-400">
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
      className="app-no-drag mt-0.5 shrink-0 cursor-grab touch-none rounded-md border border-slate-700/80 bg-slate-800/80 p-1.5 text-slate-400 hover:border-violet-500/40 hover:bg-slate-800 hover:text-slate-200 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Kéo để đổi thứ tự"
      {...attributes}
      {...listeners}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
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

type RowProps = {
  item: WatchItem
  market: Market
  mode: MarketMode
  entry: PriceMapEntry | undefined
  prices: Readonly<Record<string, PriceMapEntry>>
  onRemove: (id: string) => void
  onToggleRowMarket: (id: string) => void
  dragDisabled?: boolean
}

const WatchlistRow = memo(function WatchlistRow({
  item,
  market,
  mode,
  entry,
  prices,
  onRemove,
  onToggleRowMarket,
  dragDisabled,
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

  const badgeClassName =
    market === 'spot'
      ? 'bg-sky-500/15 text-sky-200 ring-sky-500/30'
      : 'bg-amber-500/15 text-amber-100 ring-amber-500/30'

  const draggingCls = isDragging
    ? 'scale-[1.02] shadow-lg shadow-black/40 ring-1 ring-violet-500/35'
    : ''

  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      {mode === 'perCoin' ? (
        <button
          type="button"
          className="app-no-drag rounded-md border border-slate-600 px-2 py-1 text-[10px] text-slate-300 transition-colors duration-200 hover:border-white/20 hover:text-slate-100"
          onClick={() => onToggleRowMarket(item.id)}
        >
          Đổi SPOT/FUT
        </button>
      ) : null}
      <button
        type="button"
        className="app-no-drag shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors duration-200 hover:border-white/15 hover:text-rose-200"
        aria-label={`Xóa ${display}`}
        onClick={() => onRemove(item.id)}
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

  if (!entry) {
    return (
      <li ref={setNodeRef} style={sortableStyle} className="flex gap-2">
        {handle}
        <AssetCard
          type="crypto"
          className={`min-w-0 flex-1 ${draggingCls}`}
          title={display}
          badge={market === 'spot' ? 'Spot' : 'Futures'}
          badgeClassName={badgeClassName}
          action={actions}
          price="…"
        />
      </li>
    )
  }

  if (entry.market === 'spot') {
    const price = entry.snapshot
    const pct = Number(price.priceChangePercent)
    const lastN = Number(price.lastPrice)
    return (
      <li ref={setNodeRef} style={sortableStyle} className="flex gap-2">
        {handle}
        <AssetCard
          type="crypto"
          className={`min-w-0 flex-1 ${draggingCls}`}
          title={display}
          badge="Spot · Last"
          badgeClassName={badgeClassName}
          action={actions}
          priceLabel="Giá"
          price={Number.isFinite(lastN) ? lastN : '—'}
          change={Number.isFinite(pct) ? pct : undefined}
          changeLabel="24h"
        >
          {hint ? <p className="text-[11px] text-violet-300/90">{hint}</p> : null}
        </AssetCard>
      </li>
    )
  }

  const f: FuturesMarkSnapshot = entry.snapshot
  const fr = Number(f.fundingRate)
  const frClass =
    !Number.isFinite(fr) ? 'text-slate-500' : fr >= 0 ? 'text-emerald-400' : 'text-rose-400'
  const markN = Number(f.markPrice)

  return (
    <li ref={setNodeRef} style={sortableStyle} className="flex gap-2">
      {handle}
      <AssetCard
        type="crypto"
        className={`min-w-0 flex-1 ${draggingCls}`}
        title={display}
        badge="Futures · Mark"
        badgeClassName={badgeClassName}
        action={actions}
        priceLabel="Mark price"
        price={Number.isFinite(markN) ? markN : '—'}
      >
        {hint ? <p className="text-[11px] text-violet-300/90">{hint}</p> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {f.indexPrice ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Index</p>
              <CryptoAmount raw={f.indexPrice} className="font-mono text-sm text-slate-300" />
            </div>
          ) : null}
          <div className={f.indexPrice ? 'sm:text-right' : ''}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Funding / 8h</p>
            <p className={`font-mono text-sm ${frClass}`}>{formatFundingRate(f.fundingRate)}</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Funding tiếp theo</p>
            <p className="text-xs text-slate-400">
              {new Date(f.nextFundingTime).toLocaleString('vi-VN')}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Còn lại: <FundingEta ts={f.nextFundingTime} />
            </p>
          </div>
        </div>
      </AssetCard>
    </li>
  )
})

export function WatchlistDashboard() {
  const initial = useMemo(() => loadState(), [])
  const [marketMode, setMarketMode] = useState<MarketMode>(initial.marketMode)
  const [globalMarket, setGlobalMarket] = useState<Market>(initial.globalMarket)
  const [items, setItems] = useState<WatchItem[]>(initial.items)
  const [draft, setDraft] = useState('sol')
  const [draftMarket, setDraftMarket] = useState<Market>('spot')

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

  const { prices, loading, spot, futures } = useRealtimePrice(watchEntries)

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

  const statusLine = useMemo(() => {
    const parts: string[] = []
    if (spot.streams.length > 0) {
      const st =
        spot.status === 'open'
          ? 'OK'
          : spot.status === 'reconnecting'
            ? 'tái kết nối'
            : spot.status
      parts.push(`Spot: ${st}`)
    }
    if (futures.streams.length > 0) {
      const st =
        futures.status === 'open'
          ? 'OK'
          : futures.status === 'reconnecting'
            ? 'tái kết nối'
            : futures.status
      parts.push(`Futures: ${st}`)
    }
    return parts.join(' · ')
  }, [spot, futures])

  const errTitle = [spot.lastError, futures.lastError].filter(Boolean).join(' | ')

  const statusToneClass = (() => {
    const spotOk = spot.streams.length === 0 || spot.status === 'open'
    const futOk = futures.streams.length === 0 || futures.status === 'open'
    const spotBad = spot.streams.length > 0 && spot.status === 'closed'
    const futBad = futures.streams.length > 0 && futures.status === 'closed'
    if (spotBad || futBad) return 'text-rose-400'
    if (spotOk && futOk) return 'text-emerald-400'
    return 'text-amber-400'
  })()

  const segWrap =
    'inline-flex shrink-0 rounded-md border border-slate-700/90 bg-slate-950/60 p-0.5 shadow-inner shadow-black/20'
  const segBtn =
    'rounded px-2 py-0.5 text-[11px] font-medium transition-colors duration-150'
  const segBtnOnBlue = 'bg-blue-500/25 text-blue-100 shadow-sm'
  const segBtnOff = 'text-slate-500 hover:text-slate-300'
  const segBtnOnSpot = 'bg-sky-500/25 text-sky-100 shadow-sm'
  const segBtnOnFut = 'bg-amber-500/25 text-amber-100 shadow-sm'

  const cryptoHeaderStatus = (
    <div className="flex max-w-[min(100%,14rem)] flex-col items-end gap-0.5 text-right">
      {loading && watchEntries.length > 0 ? (
        <span className="text-[10px] text-slate-500">Đang tải…</span>
      ) : null}
      <span
        className={`text-xs leading-tight ${statusToneClass}`}
        title={errTitle || undefined}
      >
        {statusLine || 'Chờ'}
      </span>
    </div>
  )

  return (
    <div className="app-no-drag flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-4 pt-1">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <AssetCard
          type="crypto"
          title="Crypto"
          badge="Binance"
          hidePrice
          price=""
          className="shrink-0"
          action={cryptoHeaderStatus}
        >
          <form
            className="space-y-1"
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <div className={segWrap} role="group" aria-label="Phạm vi danh sách">
                <button
                  type="button"
                  className={`${segBtn} ${marketMode === 'global' ? segBtnOnBlue : segBtnOff}`}
                  title="Áp dụng Spot/Futures cho cả danh sách"
                  onClick={() => setMarketMode('global')}
                >
                  Chung
                </button>
                <button
                  type="button"
                  className={`${segBtn} ${marketMode === 'perCoin' ? segBtnOnBlue : segBtnOff}`}
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
                    className={`${segBtn} ${globalMarket === 'spot' ? segBtnOnSpot : segBtnOff}`}
                    onClick={() => setGlobalMarket('spot')}
                  >
                    Spot
                  </button>
                  <button
                    type="button"
                    className={`${segBtn} ${globalMarket === 'futures' ? segBtnOnFut : segBtnOff}`}
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
                    className={`${segBtn} ${draftMarket === 'spot' ? segBtnOnSpot : segBtnOff}`}
                    onClick={() => setDraftMarket('spot')}
                  >
                    Spot
                  </button>
                  <button
                    type="button"
                    className={`${segBtn} ${draftMarket === 'futures' ? segBtnOnFut : segBtnOff}`}
                    title="Giá mark futures"
                    onClick={() => setDraftMarket('futures')}
                  >
                    Futures
                  </button>
                </div>
              )}
              <input
                id="wl-symbol-input"
                className="app-no-drag min-w-[6.5rem] min-h-[2rem] flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-100 outline-none ring-blue-500/0 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/35"
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
              <button
                type="submit"
                className="app-no-drag shrink-0 rounded-md border border-blue-500/45 bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-100 transition-colors duration-200 hover:border-blue-400/55 hover:bg-blue-500/25"
              >
                Thêm
              </button>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0">
              <span className="font-mono text-[10px] tracking-tight text-slate-500">BTC → BTCUSDT</span>
              <span className="text-[10px] text-slate-500">Chọn loại trước khi thêm</span>
            </div>
          </form>
        </AssetCard>

        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[10px] leading-tight text-slate-500">
            Mỗi coin có thể chuyển SPOT / FUTURES
          </p>
          <SessionBar />
        </div>

        <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {items.length === 0 ? (
              <li className="list-none">
                <AssetCard type="crypto" dense title="Watchlist" badge="Trống" hidePrice price="">
                  <p className="text-xs text-slate-500">Thêm cặp để xem giá realtime.</p>
                </AssetCard>
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
                    onRemove={remove}
                    onToggleRowMarket={toggleRowMarket}
                    dragDisabled={loading}
                  />
                )
              })
            )}
          </ul>
        </SortableContext>
      </DndContext>
      </div>
    </div>
  )
}
