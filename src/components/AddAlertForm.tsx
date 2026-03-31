import { memo, useMemo, useState } from 'react'
import type { AlertCondition } from '../types/alerts'
import { formatSize } from '../utils/formatNumber'
import { normalizeCryptoPairInput } from '../utils/cryptoPair'

export type AddAlertFormProps = {
  symbol?: string
  currentPrice?: number | null
  onSubmit: (data: { symbol: string; condition: AlertCondition; targetPrice: number }) => void
  onCancel: () => void
}

function parseNum(raw: string): number | null {
  const s0 = String(raw).trim().replace(/\s+/g, '')
  const s =
    s0.includes(',') && s0.includes('.')
      ? s0.replace(/,/g, '')
      : s0.includes(',') && !s0.includes('.')
        ? s0.replace(/,/g, '.')
        : s0
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export const AddAlertForm = memo(function AddAlertForm({ symbol, currentPrice, onSubmit, onCancel }: AddAlertFormProps) {
  const [sym, setSym] = useState(() => (symbol ?? '').trim().toUpperCase())
  const [condition, setCondition] = useState<AlertCondition>('above')
  const suggested = useMemo(() => {
    if (currentPrice == null || !Number.isFinite(currentPrice) || currentPrice <= 0) return null
    const v = condition === 'above' ? currentPrice * 1.05 : currentPrice * 0.95
    return v
  }, [currentPrice, condition])
  const [target, setTarget] = useState(() => (suggested != null ? String(suggested) : ''))

  const targetN = parseNum(target)
  const valid = sym.length >= 6 && sym.endsWith('USDT') && targetN != null && targetN > 0
  const normalized = useMemo(() => {
    const n = normalizeCryptoPairInput(sym)
    return n ? n.trim().toUpperCase() : ''
  }, [sym])
  const hint = normalized && normalized !== sym ? `${sym} → ${normalized}` : sym ? `${sym} → ${normalized || '—'}` : ''

  return (
    <form
      className="app-vstack-md"
      onSubmit={(e) => {
        e.preventDefault()
        const nSym = normalized || sym
        if (!(nSym.length >= 6 && nSym.endsWith('USDT')) || targetN == null || targetN <= 0) return
        onSubmit({ symbol: nSym, condition, targetPrice: targetN })
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-label font-semibold text-bx-primary">Add alert</p>
        <button type="button" className="app-no-drag text-meta text-bx-secondary hover:text-bx-primary" onClick={onCancel}>
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="text-meta font-medium uppercase tracking-wide text-bx-muted" htmlFor="al-sym">
            Symbol
          </label>
          <input
            id="al-sym"
            className="mt-1 w-full rounded-lg border border-bx-border-medium bg-bx-input px-2 py-2 font-mono text-xs text-bx-primary outline-none focus:ring-1 focus:ring-white/10"
            value={sym}
            onChange={(e) => setSym(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onBlur={() => {
              if (!sym) return
              const n = normalizeCryptoPairInput(sym)
              if (n) setSym(n.toUpperCase())
            }}
            placeholder="BTCUSDT"
            autoComplete="off"
          />
          {hint ? (
            <p className="mt-1 text-[11px] font-mono tracking-tight text-bx-muted">{hint}</p>
          ) : null}
        </div>

        <div>
          <label className="text-meta font-medium uppercase tracking-wide text-bx-muted">Condition</label>
          <div className="mt-1 flex rounded-lg border border-bx-border-medium bg-bx-input p-0.5">
            <button
              type="button"
              className={`app-no-drag flex-1 rounded-md px-2 py-2 text-[12px] font-semibold ${
                condition === 'above' ? 'bg-bx-border-medium text-bx-primary' : 'text-bx-secondary hover:text-bx-primary'
              }`}
              onClick={() => setCondition('above')}
            >
              Above
            </button>
            <button
              type="button"
              className={`app-no-drag flex-1 rounded-md px-2 py-2 text-[12px] font-semibold ${
                condition === 'below' ? 'bg-bx-border-medium text-bx-primary' : 'text-bx-secondary hover:text-bx-primary'
              }`}
              onClick={() => setCondition('below')}
            >
              Below
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="text-meta font-medium uppercase tracking-wide text-bx-muted" htmlFor="al-target">
          Target price (USDT)
        </label>
        <input
          id="al-target"
          className="mt-1 w-full rounded-lg border border-bx-border-medium bg-bx-input px-2 py-2 font-mono text-xs text-bx-primary outline-none focus:ring-1 focus:ring-white/10"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder={suggested != null ? String(suggested) : 'e.g. 70000'}
          autoComplete="off"
          inputMode="decimal"
        />
        {currentPrice != null && Number.isFinite(currentPrice) ? (
          <p className="mt-1 text-[11px] text-bx-muted">
            Current: <span className="font-mono text-bx-secondary">{formatSize(currentPrice)}</span>
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-3 py-2 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="app-no-drag rounded-lg bg-bx-yellow px-3 py-2 text-[12px] font-semibold text-bx-add-fg disabled:opacity-60"
          disabled={!valid}
        >
          Add alert
        </button>
      </div>
    </form>
  )
})

