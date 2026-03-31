import { memo, useMemo, useRef, useState } from 'react'
import { useFuturesSimulator } from '../hooks/useFuturesSimulator'
import { usePortfolio } from '../hooks/usePortfolio'
import {
  buildLadderLevels,
  highlightLevelForMark,
  ladderStepForPrice,
  pctVsMark,
  toLadderInputString,
} from '../utils/futuresPriceLadder'

type LadderTargetField = 'entry' | 'tp' | 'sl'

const inputClass =
  'w-full min-w-0 rounded-lg bg-neutral-800 px-2 py-1.5 text-sm font-medium text-neutral-100 outline-none ring-0 focus:ring-1 focus:ring-white/10 focus:ring-inset'

const labelClass = 'mb-0.5 block text-meta font-medium uppercase tracking-wide text-neutral-500'

function formatPrice(n: number | null, maxFrac = 4): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  })
}

function formatPnl(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n >= 0 ? '+' : '-'
  const v = Math.abs(n)
  return `${sign}$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function formatRatio(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `1 : ${n.toFixed(2)}`
}

function parseInputNumber(raw: string): number | null {
  const n = Number(String(raw).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

export type FuturesSimulatorPanelProps = {
  symbol: string
  currentPrice: number
  /** Optional stable key (e.g. watchlist row id) so entry re-seeds when the row / market changes */
  symbolKey?: string
  className?: string
  onClose?: () => void
}

export const FuturesSimulatorPanel = memo(function FuturesSimulatorPanel({
  symbol,
  currentPrice,
  symbolKey,
  className = '',
  onClose,
}: FuturesSimulatorPanelProps) {
  const key = symbolKey ?? symbol
  const {
    entryPrice,
    setEntryPrice,
    leverage,
    setLeverage,
    positionSize,
    setPositionSize,
    tp,
    setTp,
    sl,
    setSl,
    side,
    setSide,
    metrics,
  } = useFuturesSimulator({ currentPrice, symbolKey: key })

  const { pnl, pnlPercent, tpPnl, slPnl, riskReward, liquidationPrice } = metrics
  const pf = usePortfolio(false)

  const [ladderTarget, setLadderTarget] = useState<LadderTargetField>('entry')
  const [pulseField, setPulseField] = useState<LadderTargetField | null>(null)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const entryRef = useRef<HTMLInputElement>(null)
  const levRef = useRef<HTMLInputElement>(null)
  const sizeRef = useRef<HTMLInputElement>(null)
  const tpRef = useRef<HTMLInputElement>(null)
  const slRef = useRef<HTMLInputElement>(null)

  const ladderStep = useMemo(
    () => (currentPrice > 0 ? ladderStepForPrice(currentPrice) : 1),
    [currentPrice],
  )

  const ladderLevels = useMemo(
    () =>
      currentPrice > 0 ? buildLadderLevels(currentPrice, ladderStep, 7) : [],
    [currentPrice, ladderStep],
  )

  const markHighlightLevel = useMemo(
    () =>
      ladderLevels.length > 0 && currentPrice > 0
        ? highlightLevelForMark(ladderLevels, currentPrice)
        : null,
    [ladderLevels, currentPrice],
  )

  const applyLadderPrice = (raw: number) => {
    const s = toLadderInputString(raw)
    if (ladderTarget === 'entry') setEntryPrice(s)
    else if (ladderTarget === 'tp') setTp(s)
    else setSl(s)

    const ref =
      ladderTarget === 'entry'
        ? entryRef
        : ladderTarget === 'tp'
          ? tpRef
          : slRef
    ref.current?.focus()

    setPulseField(ladderTarget)
    if (pulseTimerRef.current != null) clearTimeout(pulseTimerRef.current)
    pulseTimerRef.current = window.setTimeout(() => {
      pulseTimerRef.current = null
      setPulseField(null)
    }, 180)
  }

  const segSmall =
    'rounded-md px-2 py-0.5 text-meta font-semibold uppercase tracking-wide transition-colors duration-150'
  const segOn = 'bg-amber-500/25 text-amber-100 shadow-sm'
  const segOff = 'bg-neutral-800/60 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'

  const pnlTone =
    pnl == null ? 'text-neutral-300' : pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'

  const longOn =
    side === 'LONG'
      ? 'bg-emerald-600/90 text-white shadow-sm shadow-emerald-900/40'
      : 'bg-neutral-800/80 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
  const shortOn =
    side === 'SHORT'
      ? 'bg-rose-600/90 text-white shadow-sm shadow-rose-900/40'
      : 'bg-neutral-800/80 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'

  const entryN = parseInputNumber(entryPrice)
  const levN = parseInputNumber(leverage)
  const sizeUsdtN = parseInputNumber(positionSize)
  const canSave =
    symbol.trim().length > 0 &&
    entryN != null &&
    entryN > 0 &&
    levN != null &&
    levN > 0 &&
    sizeUsdtN != null &&
    sizeUsdtN > 0

  const saveHint = canSave ? '' : 'Fill required fields (Entry, Size, Lev)'

  const handleSave = () => {
    if (!canSave || entryN == null || levN == null || sizeUsdtN == null) return
    const quantity = sizeUsdtN / entryN
    if (!Number.isFinite(quantity) || quantity <= 0) return

    pf.addPosition({
      symbol,
      side,
      entryPrice: entryN,
      quantity,
      leverage: levN,
    })

    setJustSaved(true)
    if (savedTimerRef.current != null) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setJustSaved(false)
    }, 2000)
  }

  return (
    <div
      className={`app-no-drag flex min-w-0 w-full max-w-none shrink-0 flex-col overflow-hidden bg-neutral-900 shadow-xl ring-1 ring-white/5 ${className}`.trim()}
    >
      {/* Header (fixed) */}
      <div className="shrink-0 app-pad-lg">
        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
          <div className="min-w-0 app-vstack-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-mono text-sm font-semibold tracking-tight text-neutral-100">
                {symbol}
              </span>
              <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-400/95">
                Futures
              </span>
            </div>
            <p className="text-meta text-neutral-500">USDT-M · Mark</p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <div className="min-w-0 text-right">
              <p className="truncate font-mono text-sm font-semibold tabular-nums text-neutral-100">
                {currentPrice > 0 ? formatPrice(currentPrice) : '—'}
              </p>
            </div>
            {onClose ? (
              <button
                type="button"
                className="app-no-drag flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200"
                aria-label="Close"
                onClick={onClose}
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Body (scrollable) */}
      <div className="min-h-0 flex-1 overflow-y-auto app-pad-lg pt-0">
        <div className="app-vstack-md pb-3">

        {currentPrice > 0 && ladderLevels.length > 0 ? (
          <div className="app-vstack-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-meta font-medium text-neutral-500">Ladder</span>
              <div
                className="flex rounded-lg border border-neutral-700/80 bg-neutral-950/50 p-0.5"
                role="group"
                aria-label="Ô giá được điền khi chọn mức"
              >
                <button
                  type="button"
                  className={`app-no-drag shrink-0 ${segSmall} ${ladderTarget === 'entry' ? segOn : segOff}`}
                  onClick={() => setLadderTarget('entry')}
                >
                  Ent
                </button>
                <button
                  type="button"
                  className={`app-no-drag shrink-0 ${segSmall} ${ladderTarget === 'tp' ? segOn : segOff}`}
                  onClick={() => setLadderTarget('tp')}
                >
                  TP
                </button>
                <button
                  type="button"
                  className={`app-no-drag shrink-0 ${segSmall} ${ladderTarget === 'sl' ? segOn : segOff}`}
                  onClick={() => setLadderTarget('sl')}
                >
                  SL
                </button>
              </div>
            </div>
            <div className="max-h-[5rem] overflow-y-auto overflow-x-hidden rounded-lg border border-neutral-800/90 bg-neutral-950/40">
              <ul className="divide-y divide-neutral-800/80 py-0.5" role="listbox">
                {ladderLevels.map((level) => {
                  const isMark = markHighlightLevel != null && level === markHighlightLevel
                  const pct = pctVsMark(level, currentPrice)
                  const pctStr =
                    pct === 0
                      ? '0%'
                      : `${pct > 0 ? '+' : ''}${pct.toFixed(Math.abs(pct) < 0.1 ? 3 : 2)}%`
                  return (
                    <li key={String(level)}>
                      <button
                        type="button"
                        className={`app-no-drag flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left transition-colors duration-150 ease-out ${
                          isMark
                            ? 'bg-amber-500/15 text-amber-50 ring-1 ring-inset ring-amber-500/35'
                            : 'text-neutral-200 hover:bg-neutral-800/70 active:bg-neutral-800'
                        }`}
                        onClick={() => applyLadderPrice(level)}
                        role="option"
                        aria-selected={isMark}
                      >
                        <span className="min-w-0 truncate font-mono text-label font-semibold tabular-nums">
                          {formatPrice(level)}
                          {isMark ? (
                            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-400/90">
                              M
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={`shrink-0 text-meta font-mono tabular-nums ${
                            pct > 0
                              ? 'text-emerald-400/85'
                              : pct < 0
                                ? 'text-rose-400/85'
                                : 'text-amber-300/90'
                          }`}
                        >
                          {pctStr}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="app-vstack-md">
          <div className="min-w-0">
            <label className={labelClass} htmlFor="fs-entry">
              Entry
            </label>
            <input
              id="fs-entry"
              type="text"
              inputMode="decimal"
              ref={entryRef}
              className={`${inputClass} ${pulseField === 'entry' ? 'app-input-pulse' : ''}`.trim()}
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              onFocus={() => setLadderTarget('entry')}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className={labelClass} htmlFor="fs-lev">
                Lev
              </label>
              <input
                id="fs-lev"
                type="text"
                inputMode="decimal"
              ref={levRef}
              className={inputClass}
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass} htmlFor="fs-size">
                Size
              </label>
              <input
                id="fs-size"
                type="text"
                inputMode="decimal"
              ref={sizeRef}
              className={inputClass}
                value={positionSize}
                onChange={(e) => setPositionSize(e.target.value)}
                autoComplete="off"
                title="USDT"
              />
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className={labelClass} htmlFor="fs-tp">
                TP
              </label>
              <input
                id="fs-tp"
                type="text"
                inputMode="decimal"
              ref={tpRef}
              className={`${inputClass} ${pulseField === 'tp' ? 'app-input-pulse' : ''}`.trim()}
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                onFocus={() => setLadderTarget('tp')}
                placeholder="—"
                autoComplete="off"
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass} htmlFor="fs-sl">
                SL
              </label>
              <input
                id="fs-sl"
                type="text"
                inputMode="decimal"
              ref={slRef}
              className={`${inputClass} ${pulseField === 'sl' ? 'app-input-pulse' : ''}`.trim()}
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                onFocus={() => setLadderTarget('sl')}
                placeholder="—"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2">
          <button
            type="button"
            className={`app-no-drag shrink-0 rounded-lg py-1.5 text-xs font-semibold transition-colors ${longOn}`}
            onClick={() => setSide('LONG')}
          >
            LONG
          </button>
          <button
            type="button"
            className={`app-no-drag shrink-0 rounded-lg py-1.5 text-xs font-semibold transition-colors ${shortOn}`}
            onClick={() => setSide('SHORT')}
          >
            SHORT
          </button>
        </div>

        <div className="rounded-xl bg-gradient-to-b from-amber-500/10 to-neutral-950/90 px-3 py-3 ring-1 ring-amber-500/20 ring-inset">
          <div className="app-vstack-sm">
            <p className="text-center text-meta font-semibold uppercase tracking-wider text-neutral-500">PnL (mark)</p>
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
              <span className={`font-mono text-pnl font-semibold tabular-nums tracking-tight max-[299px]:text-xl ${pnlTone}`}>
                {formatPnl(pnl)}
              </span>
              <span className={`font-mono text-price font-semibold tabular-nums ${pnlTone}`}>
                {formatPct(pnlPercent)}
              </span>
            </div>
          </div>

          <div className="app-divider my-2" />

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-label">
            <div className="flex justify-between gap-2">
              <span className="shrink-0 text-neutral-500">TP</span>
              <span className="min-w-0 truncate font-mono font-medium tabular-nums text-emerald-400/90">
                {formatPnl(tpPnl)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="shrink-0 text-neutral-500">SL</span>
              <span className="min-w-0 truncate font-mono font-medium tabular-nums text-rose-400/90">
                {formatPnl(slPnl)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="shrink-0 text-neutral-500">R:R</span>
              <span className="min-w-0 truncate font-mono font-medium tabular-nums text-neutral-200">
                {formatRatio(riskReward)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="shrink-0 text-neutral-500">Liq</span>
              <span className="min-w-0 truncate font-mono font-medium tabular-nums text-neutral-200">
                {formatPrice(liquidationPrice)}
              </span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Footer (sticky) */}
      <div className="shrink-0 border-t border-white/10 bg-neutral-900/95 app-pad-lg">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || justSaved}
          title={justSaved ? 'Saved' : saveHint}
          className={`app-no-drag w-full rounded-xl border px-3 py-2 text-label font-semibold transition-colors duration-[120ms] ${
            justSaved
              ? 'border-profit/35 bg-profit/10 text-profit'
              : canSave
                ? 'border-white/[0.10] bg-neutral-950/40 text-neutral-200 hover:bg-neutral-800/50'
                : 'cursor-not-allowed border-white/[0.06] bg-neutral-950/20 text-neutral-600'
          }`}
        >
          {justSaved ? '✓ Saved to Portfolio' : '📊 Add to Portfolio'}
        </button>
      </div>
    </div>
  )
})
