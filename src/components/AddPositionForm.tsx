import { memo, useEffect, useMemo, useState } from 'react'
import type { FuturesPositionSide } from '../types/portfolio'

const COMMON = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT']

function loadWatchlistSymbolsUpper(): string[] {
  try {
    const raw = localStorage.getItem('crypto-watchlist-v2')
    if (!raw) return []
    const parsed = JSON.parse(raw) as any
    const items = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : []
    const syms: string[] = items
      .map((x: any) => (typeof x?.symbol === 'string' ? x.symbol : typeof x === 'string' ? x : ''))
      .map((s: string) => s.trim().toUpperCase())
      .filter((s: string) => s.length > 0)
    return [...new Set(syms)]
  } catch {
    return []
  }
}

function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function parsePosNumber(raw: string): number | null {
  const s0 = String(raw).trim().replace(/\s+/g, '')
  const s =
    s0.includes(',') && s0.includes('.')
      ? s0.replace(/,/g, '')
      : s0.includes(',') && !s0.includes('.')
        ? s0.replace(/,/g, '.')
        : s0
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

export type AddPositionDraft = {
  symbol: string
  side: FuturesPositionSide
  entryPrice: string
  margin: string
  leverage: string
}

export type AddPositionFormProps = {
  onSubmit: (data: { symbol: string; side: FuturesPositionSide; entryPrice: number; margin: number; leverage: number }) => void
  onCancel: () => void
}

export const AddPositionForm = memo(function AddPositionForm({ onSubmit, onCancel }: AddPositionFormProps) {
  const [draft, setDraft] = useState<AddPositionDraft>({
    symbol: '',
    side: 'LONG',
    entryPrice: '',
    margin: '',
    leverage: '10',
  })

  const [touched, setTouched] = useState(false)

  const suggestions = useMemo(() => {
    const wl = loadWatchlistSymbolsUpper()
    const merged = [...wl, ...COMMON]
    return [...new Set(merged)].slice(0, 16)
  }, [])

  const symNorm = normalizeSymbol(draft.symbol)
  const entry = parsePosNumber(draft.entryPrice)
  const margin = parsePosNumber(draft.margin)
  const lev = parsePosNumber(draft.leverage)

  const valid =
    symNorm.length >= 6 && symNorm.endsWith('USDT') && entry != null && margin != null && lev != null

  useEffect(() => {
    // keep symbol displayed normalized without fighting the cursor too hard
    if (!draft.symbol) return
    const n = normalizeSymbol(draft.symbol)
    if (n !== draft.symbol) setDraft((d) => ({ ...d, symbol: n }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!valid || entry == null || margin == null || lev == null) return
    onSubmit({ symbol: symNorm, side: draft.side, entryPrice: entry, margin, leverage: lev })
  }

  const sideBtnBase =
    'app-no-drag shrink-0 rounded-lg px-3 py-1 text-label font-semibold transition-colors duration-[120ms]'
  const longOn = 'bg-profit/20 text-profit ring-1 ring-inset ring-profit/25'
  const longOff = 'bg-bx-input text-bx-secondary hover:text-bx-primary'
  const shortOn = 'bg-loss/20 text-loss ring-1 ring-inset ring-loss/25'
  const shortOff = 'bg-bx-input text-bx-secondary hover:text-bx-primary'

  const input =
    'app-no-drag w-full min-w-0 rounded-lg border border-bx-border-medium bg-bx-input px-2 py-1.5 font-mono text-sm text-bx-primary outline-none ring-0 focus:ring-1 focus:ring-white/10 focus:ring-inset'
  const label = 'text-meta font-medium uppercase tracking-wide text-bx-muted'

  return (
    <form onSubmit={submit} className="app-vstack-lg">
      <div className="app-vstack-md">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label font-semibold text-bx-primary">Add position</p>
          <button type="button" className="app-no-drag text-meta text-bx-secondary hover:text-bx-primary" onClick={onCancel}>
            Close
          </button>
        </div>

        <div className="app-vstack-sm">
          <span className={label}>Side</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={`${sideBtnBase} ${draft.side === 'LONG' ? longOn : longOff}`}
              onClick={() => setDraft((d) => ({ ...d, side: 'LONG' }))}
            >
              LONG
            </button>
            <button
              type="button"
              className={`${sideBtnBase} ${draft.side === 'SHORT' ? shortOn : shortOff}`}
              onClick={() => setDraft((d) => ({ ...d, side: 'SHORT' }))}
            >
              SHORT
            </button>
          </div>
        </div>

        <div className="app-vstack-sm">
          <label className={label} htmlFor="pf-sym">Symbol</label>
          <input
            id="pf-sym"
            className={input}
            value={draft.symbol}
            onChange={(e) => setDraft((d) => ({ ...d, symbol: normalizeSymbol(e.target.value) }))}
            placeholder="BTCUSDT"
            list="pf-sym-suggest"
            autoComplete="off"
          />
          <datalist id="pf-sym-suggest">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          {touched && (symNorm.length === 0 || !symNorm.endsWith('USDT')) ? (
            <p className="text-meta text-amber-200/80">Nhập mã futures dạng `...USDT` (ví dụ BTCUSDT).</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="app-vstack-sm">
            <label className={label} htmlFor="pf-entry">Entry</label>
            <input
              id="pf-entry"
              className={input}
              inputMode="decimal"
              value={draft.entryPrice}
              onChange={(e) => setDraft((d) => ({ ...d, entryPrice: e.target.value }))}
              placeholder="e.g. 67000"
              autoComplete="off"
            />
          </div>
          <div className="app-vstack-sm">
            <label className={label} htmlFor="pf-margin">Margin</label>
            <input
              id="pf-margin"
              className={input}
              inputMode="decimal"
              value={draft.margin}
              onChange={(e) => setDraft((d) => ({ ...d, margin: e.target.value }))}
              placeholder="e.g. 100"
              autoComplete="off"
              title="USDT"
            />
          </div>
        </div>

        <div className="app-vstack-sm">
          <label className={label} htmlFor="pf-lev">Leverage</label>
          <input
            id="pf-lev"
            className={input}
            inputMode="decimal"
            value={draft.leverage}
            onChange={(e) => setDraft((d) => ({ ...d, leverage: e.target.value }))}
            placeholder="10"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-3 py-2 text-label font-semibold text-bx-secondary hover:text-bx-primary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="app-no-drag rounded-lg bg-bx-yellow px-3 py-2 text-label font-semibold text-bx-add-fg hover:opacity-95 disabled:opacity-60"
          disabled={!valid}
        >
          Add
        </button>
      </div>
    </form>
  )
})

