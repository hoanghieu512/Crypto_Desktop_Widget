import { memo } from 'react'

export type SegOption<T extends string> = {
  value: T
  label: string
  title?: string
}

export type SegmentedToggleProps<T extends string> = {
  options: readonly SegOption<T>[]
  value: T
  onChange: (v: T) => void
  /**
   * Hai cấp visual (Phase 4):
   * - 'glass': pill mờ blur + glider gradient accent + glow — CHỈ cho VND/USD
   *   (card Vàng/Bạc) và Compact/Full (toolbar Crypto). Accent tự theo tab.
   * - 'flat': glider phẳng màu surface, không blur/glow — Chung–Từng coin,
   *   Spot/Futures và mọi toggle lặp theo dòng (tránh chi phí backdrop-filter).
   * Cùng geometry, cùng nhịp trượt (300ms, ease limelight).
   */
  tier: 'glass' | 'flat'
  /** Mini cho per-row watchlist */
  dense?: boolean
  ariaLabel: string
  className?: string
}

function SegmentedToggleInner<T extends string>({
  options,
  value,
  onChange,
  tier,
  dense = false,
  ariaLabel,
  className = '',
}: SegmentedToggleProps<T>) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  const n = options.length

  const wrap =
    tier === 'glass'
      ? 'relative inline-grid shrink-0 grid-flow-col auto-cols-fr rounded-[10px] border border-white/10 bg-white/[0.06] p-0.5 backdrop-blur-[6px]'
      : 'relative inline-grid shrink-0 grid-flow-col auto-cols-fr rounded-md border border-bx-border-medium bg-bx-input p-0.5'

  const btnPad = dense
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-[11px] max-[299px]:px-1.5 max-[299px]:text-[10px]'

  const btnOn =
    tier === 'glass' ? 'font-bold text-bx-add-fg' : 'font-medium text-bx-primary'
  const btnOff = 'font-medium text-bx-secondary hover:text-bx-primary'

  return (
    <div className={`${wrap} ${className}`.trim()} role="group" aria-label={ariaLabel}>
      <span
        aria-hidden
        className={`app-seg-glider ${
          tier === 'glass' ? 'app-seg-glider-glass' : 'app-seg-glider-flat'
        }`}
        style={{
          width: `calc((100% - 4px) / ${n})`,
          transform: `translateX(${idx * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={o.value === value}
          className={`app-no-drag relative z-10 shrink-0 rounded text-center transition-colors duration-150 ${btnPad} ${
            o.value === value ? btnOn : btnOff
          }`}
          onClick={() => {
            if (o.value !== value) onChange(o.value)
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const SegmentedToggle = memo(SegmentedToggleInner) as typeof SegmentedToggleInner
