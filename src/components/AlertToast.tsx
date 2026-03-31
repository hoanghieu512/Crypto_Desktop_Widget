import { memo, useEffect } from 'react'
import type { AlertToast as Toast } from '../hooks/usePriceAlerts'

export type AlertToastProps = {
  items: Toast[]
  onDismiss: (id: string) => void
}

export const AlertToast = memo(function AlertToast({ items, onDismiss }: AlertToastProps) {
  useEffect(() => {
    if (items.length === 0) return
    const id = window.setTimeout(() => {
      const last = items[items.length - 1]
      if (last) onDismiss(last.id)
    }, 9000)
    return () => window.clearTimeout(id)
  }, [items, onDismiss])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[260] flex w-[min(320px,calc(100%-24px))] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-xl border border-bx-border-medium bg-bx-elevated px-3 py-2 shadow-2xl shadow-black/60"
          role="status"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-bx-primary">{t.title}</p>
              <p className="mt-0.5 text-[12px] text-bx-secondary">{t.message}</p>
            </div>
            <button
              type="button"
              className="app-no-drag -mt-0.5 rounded-md px-2 py-1 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
})

