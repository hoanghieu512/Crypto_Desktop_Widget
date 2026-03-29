import { useFormat } from '../providers/FormatProvider'
import type { FormatCurrency, FormatMode } from '../utils/formatPrice'

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: readonly { id: T; label: string }[]
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-700/90 bg-slate-900/80 p-0.5"
      role="group"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
            value === o.id
              ? 'bg-slate-600/80 text-slate-50'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const MODES = [
  { id: 'compact' as const, label: 'Compact' },
  { id: 'full' as const, label: 'Full' },
]

const CURRENCIES = [
  { id: 'VND' as const, label: 'VND' },
  { id: 'USD' as const, label: 'USD' },
]

export function FormatControls() {
  const { mode, setMode, currency, setCurrency } = useFormat()

  return (
    <div className="app-no-drag flex flex-wrap items-center gap-2">
      <span className="hidden text-[9px] uppercase text-slate-500 sm:inline">Giá</span>
      <Seg<FormatMode> value={mode} onChange={setMode} options={MODES} />
      <Seg<FormatCurrency> value={currency} onChange={setCurrency} options={CURRENCIES} />
    </div>
  )
}
