import { useEffect, useState } from 'react'
import { PortfolioDashboard } from './PortfolioDashboard'

export type PortfolioSidePanelProps = {
  isOpen: boolean
  onClose: () => void
}

export function PortfolioSidePanel({ isOpen, onClose }: PortfolioSidePanelProps) {
  const [enter, setEnter] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setEnter(false)
      return
    }
    let raf2: number | null = null
    const raf1 = requestAnimationFrame(() => {
      setEnter(false)
      raf2 = requestAnimationFrame(() => setEnter(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2 != null) cancelAnimationFrame(raf2)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="pointer-events-auto fixed inset-0 z-[150] overflow-hidden" role="dialog" aria-modal="true" aria-label="Portfolio panel">
      <button
        type="button"
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ease-out ${
          enter ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Close"
        onClick={onClose}
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-white/[0.08] bg-bx-base shadow-2xl shadow-black/70 ring-1 ring-black/40 transition-[transform,opacity] duration-250 ease-out sm:w-2/5 sm:min-w-80 ${
          enter ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transform: enter ? 'translate3d(0,0,0)' : 'translate3d(12px,0,0)',
        }}
      >
        <div className="app-no-drag flex items-center justify-between gap-2 border-b border-bx-border-subtle bg-bx-surface px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-symbol font-semibold text-bx-primary">Portfolio</p>
            <p className="truncate text-meta text-bx-muted">Multi-position unrealized PnL</p>
          </div>
          <button
            type="button"
            className="app-no-drag flex size-9 items-center justify-center rounded-lg text-bx-secondary hover:bg-bx-elevated hover:text-bx-primary"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-visible">
          <PortfolioDashboard active={isOpen} embedded />
        </div>
      </aside>
    </div>
  )
}

