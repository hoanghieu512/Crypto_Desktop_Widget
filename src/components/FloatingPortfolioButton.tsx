import { memo, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'futures-portfolio-v1'

function readCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as any
    const positions = Array.isArray(parsed?.positions) ? parsed.positions : []
    return positions.length
  } catch {
    return 0
  }
}

export type FloatingPortfolioButtonProps = {
  onClick: () => void
}

export const FloatingPortfolioButton = memo(function FloatingPortfolioButton({
  onClick,
}: FloatingPortfolioButtonProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(readCount())
    const onAny = () => setCount(readCount())
    window.addEventListener('storage', onAny)
    window.addEventListener('portfolio:change', onAny as EventListener)
    return () => {
      window.removeEventListener('storage', onAny)
      window.removeEventListener('portfolio:change', onAny as EventListener)
    }
  }, [])

  const badge = useMemo(() => {
    if (count <= 0) return null
    const text = count > 99 ? '99+' : String(count)
    return (
      <span className="pointer-events-none absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-bx-border-medium bg-bx-base px-1.5 py-0.5 text-[10px] font-bold leading-none text-bx-primary shadow-panel">
        {text}
      </span>
    )
  }, [count])

  return (
    <button
      type="button"
      className="app-no-drag fixed bottom-5 right-5 z-[120] flex size-12 items-center justify-center rounded-full bg-accent/[0.92] text-bx-add-fg shadow-lg shadow-black/40 transition-[transform,filter,background-color] duration-[120ms] hover:bg-accent active:scale-[0.98]"
      aria-label="Open Portfolio"
      title="Portfolio"
      onClick={onClick}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M5 20V10M12 20V4M19 20v-8" />
      </svg>
      {badge}
    </button>
  )
})

