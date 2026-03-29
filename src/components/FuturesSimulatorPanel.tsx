import { memo, useMemo, useState } from 'react'
import { useFuturesSimulator } from '../hooks/useFuturesSimulator'
import {
  buildLadderLevels,
  highlightLevelForMark,
  ladderStepForPrice,
  pctVsMark,
  toLadderInputString,
} from '../utils/futuresPriceLadder'

type LadderTargetField = 'entry' | 'tp' | 'sl'

const inputClass =
  'w-full rounded-lg bg-neutral-800 px-2 py-1.5 text-sm font-medium text-neutral-100 outline-none ring-0 focus:ring-1 focus:ring-neutral-600'

const labelClass = 'mb-0.5 block text-[10px] text-neutral-400'

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

export type FuturesSimulatorPanelProps = {
  symbol: string
  currentPrice: number
  /** Optional stable key (e.g. watchlist row id) so entry re-seeds when the row / market changes */
  symbolKey?: string
  className?: string
}

export const FuturesSimulatorPanel = memo(function FuturesSimulatorPanel({
  symbol,
  currentPrice,
  symbolKey,
  className = '',
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

  const [ladderTarget, setLadderTarget] = useState<LadderTargetField>('entry')

  const ladderStep = useMemo(
    () => (currentPrice > 0 ? ladderStepForPrice(currentPrice) : 1),
    [currentPrice],
  )

  const ladderLevels = useMemo(
    () =>
      currentPrice > 0 ? buildLadderLevels(currentPrice, ladderStep, 11) : [],
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
  }

  const segSmall =
    'rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-150'
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

  return (
    <div
      className={`app-no-drag w-full max-w-[320px] shrink-0 rounded-2xl bg-neutral-900 p-3 shadow-xl ring-1 ring-white/5 ${className}`.trim()}
    >
      {/* Header */}
      <div className="mb-2.5 flex items-start justify-between gap-2 border-b border-white/10 pb-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-mono text-sm font-semibold tracking-tight text-neutral-100">
              {symbol}
            </span>
            <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-400/95">
              Futures
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-neutral-500">Simulator · USDT-M</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-neutral-400">Mark</p>
          <p className="font-mono text-sm font-semibold tabular-nums text-neutral-100">
            {currentPrice > 0 ? formatPrice(currentPrice) : '—'}
          </p>
        </div>
      </div>

      {currentPrice > 0 && ladderLevels.length > 0 ? (
        <div className="mb-2.5 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-[10px] font-medium text-neutral-500">Price ladder</span>
            <div
              className="flex rounded-lg border border-neutral-700/80 bg-neutral-950/50 p-0.5"
              role="group"
              aria-label="Ô giá được điền khi chọn mức"
            >
              <button
                type="button"
                className={`app-no-drag ${segSmall} ${ladderTarget === 'entry' ? segOn : segOff}`}
                onClick={() => setLadderTarget('entry')}
              >
                Entry
              </button>
              <button
                type="button"
                className={`app-no-drag ${segSmall} ${ladderTarget === 'tp' ? segOn : segOff}`}
                onClick={() => setLadderTarget('tp')}
              >
                TP
              </button>
              <button
                type="button"
                className={`app-no-drag ${segSmall} ${ladderTarget === 'sl' ? segOn : segOff}`}
                onClick={() => setLadderTarget('sl')}
              >
                SL
              </button>
            </div>
          </div>
          <p className="text-[9px] leading-tight text-neutral-600">
            Click mức để điền {ladderTarget === 'entry' ? 'Entry' : ladderTarget === 'tp' ? 'Take profit' : 'Stop loss'} · so với Mark
          </p>
          <div className="max-h-[8.5rem] overflow-y-auto overflow-x-hidden rounded-lg border border-neutral-800/90 bg-neutral-950/40">
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
                      <span className="font-mono text-[11px] font-semibold tabular-nums">
                        {formatPrice(level)}
                        {isMark ? (
                          <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-400/90">
                            Mark
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`shrink-0 text-[10px] font-mono tabular-nums ${
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

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        <div className="col-span-2">
          <label className={labelClass} htmlFor="fs-entry">
            Entry price
          </label>
          <input
            id="fs-entry"
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            onFocus={() => setLadderTarget('entry')}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="fs-lev">
            Leverage
          </label>
          <input
            id="fs-lev"
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="fs-size">
            Position (USDT)
          </label>
          <input
            id="fs-size"
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={positionSize}
            onChange={(e) => setPositionSize(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="fs-tp">
            Take profit
          </label>
          <input
            id="fs-tp"
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={tp}
            onChange={(e) => setTp(e.target.value)}
            onFocus={() => setLadderTarget('tp')}
            placeholder="—"
            autoComplete="off"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="fs-sl">
            Stop loss
          </label>
          <input
            id="fs-sl"
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={sl}
            onChange={(e) => setSl(e.target.value)}
            onFocus={() => setLadderTarget('sl')}
            placeholder="—"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Side */}
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          className={`app-no-drag rounded-lg py-1.5 text-xs font-bold transition-colors ${longOn}`}
          onClick={() => setSide('LONG')}
        >
          LONG
        </button>
        <button
          type="button"
          className={`app-no-drag rounded-lg py-1.5 text-xs font-bold transition-colors ${shortOn}`}
          onClick={() => setSide('SHORT')}
        >
          SHORT
        </button>
      </div>

      {/* Results */}
      <div className="mt-2.5 space-y-1 rounded-xl bg-neutral-950/80 px-2.5 py-2 ring-1 ring-white/5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] text-neutral-400">PnL (mark)</span>
          <span className={`text-lg font-bold tabular-nums ${pnlTone}`}>{formatPnl(pnl)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-[10px] text-neutral-500">PnL % (on margin)</span>
          <span className={`font-semibold tabular-nums ${pnlTone}`}>{formatPct(pnlPercent)}</span>
        </div>
        <div className="border-t border-white/5 pt-1">
          <div className="flex justify-between gap-2 text-[11px]">
            <span className="text-neutral-500">TP PnL</span>
            <span className="font-mono font-medium tabular-nums text-emerald-400/90">
              {formatPnl(tpPnl)}
            </span>
          </div>
          <div className="mt-0.5 flex justify-between gap-2 text-[11px]">
            <span className="text-neutral-500">SL PnL</span>
            <span className="font-mono font-medium tabular-nums text-rose-400/90">
              {formatPnl(slPnl)}
            </span>
          </div>
          <div className="mt-0.5 flex justify-between gap-2 text-[11px]">
            <span className="text-neutral-500">Risk / Reward</span>
            <span className="font-mono font-medium tabular-nums text-neutral-200">{formatRatio(riskReward)}</span>
          </div>
          <div className="mt-0.5 flex justify-between gap-2 text-[11px]">
            <span className="text-neutral-500">Liq. (approx.)</span>
            <span className="font-mono font-medium tabular-nums text-neutral-200">
              {formatPrice(liquidationPrice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})
