import { memo, useEffect, useState } from 'react'
import type { AlertToast as Toast } from '../hooks/usePriceAlerts'
import { ToastShell } from './ToastShell'

export type AlertToastProps = {
  items: Toast[]
  onDismiss: (id: string) => void
}

/**
 * Engine giữ nguyên (toasts từ usePriceAlerts, 9s auto-dismiss). Phase 4:
 * visual ToastShell type info/alert (teal), stack overlap, hover dừng đếm giờ.
 */
export const AlertToast = memo(function AlertToast({ items, onDismiss }: AlertToastProps) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (items.length === 0 || paused) return
    const id = window.setTimeout(() => {
      const last = items[items.length - 1]
      if (last) onDismiss(last.id)
    }, 9000)
    return () => window.clearTimeout(id)
  }, [items, onDismiss, paused])

  if (items.length === 0) return null

  // items append theo thời gian → đảo để toast mới nhất nằm trên cùng (sát anchor)
  const ordered = [...items].reverse()

  return (
    <div
      className="pointer-events-none fixed right-3 top-3 z-[260] flex w-[min(320px,calc(100%-24px))] flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {ordered.map((t, j) => (
        <div key={t.id} className={j > 0 ? 'relative -mt-7' : 'relative'} style={{ zIndex: 50 - j }}>
          <ToastShell
            type="info"
            title={t.title}
            message={t.message}
            depth={j}
            onClose={() => onDismiss(t.id)}
          />
        </div>
      ))}
    </div>
  )
})
