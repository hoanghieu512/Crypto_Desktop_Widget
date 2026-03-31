import { useFormat } from '../providers/FormatProvider'
import type { FormatCurrency, FormatMode } from '../utils/formatPrice'

export type FormatControlsVariant = 'crypto' | 'metals'

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
      className="inline-flex shrink-0 rounded-lg border border-bx-border-medium bg-bx-input p-0.5"
      role="group"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
            value === o.id
              ? 'bg-bx-border-medium text-bx-primary'
              : 'text-bx-secondary hover:bg-bx-elevated hover:text-bx-primary'
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

type Props = {
  /** Crypto: định dạng số. Vàng/Bạc: tiền tệ. */
  variant: FormatControlsVariant
}

export function FormatControls({ variant }: Props) {
  const { mode, setMode, currency, setCurrency } = useFormat()

  return (
    <div className="app-no-drag flex min-w-0 flex-wrap items-center justify-center gap-2 max-[299px]:gap-1.5">
      <span className="hidden min-[361px]:inline shrink-0 text-[9px] font-medium uppercase tracking-wide text-bx-muted">
        {variant === 'crypto' ? 'Định dạng' : 'Tiền tệ'}
      </span>
      {variant === 'crypto' ? (
        <Seg<FormatMode> value={mode} onChange={setMode} options={MODES} />
      ) : (
        <Seg<FormatCurrency> value={currency} onChange={setCurrency} options={CURRENCIES} />
      )}
    </div>
  )
}
