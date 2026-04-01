import { memo, useCallback, useEffect, useState } from 'react'
import { APP_TOAST_ERROR_EVENT, type AppToastPayload } from '../utils/appToast'

type Item = AppToastPayload & { id: string }

const AUTO_MS = 5000

export const AppErrorToasts = memo(function AppErrorToasts() {
  const [items, setItems] = useState<Item[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  useEffect(() => {
    const on = (e: Event) => {
      const ce = e as CustomEvent<AppToastPayload>
      const d = ce.detail
      if (!d || d.type !== 'error') return
      const id = crypto.randomUUID()
      const next: Item = { id, type: 'error', title: d.title, message: d.message }
      setItems((prev) => [next, ...prev].slice(0, 4))
      window.setTimeout(() => dismiss(id), AUTO_MS)
    }
    window.addEventListener(APP_TOAST_ERROR_EVENT, on as EventListener)
    return () => window.removeEventListener(APP_TOAST_ERROR_EVENT, on as EventListener)
  }, [dismiss])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-[148px] right-3 z-[255] flex w-[min(320px,calc(100%-24px))] flex-col gap-2 max-[380px]:bottom-[132px]">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-xl border border-bx-red/35 bg-bx-elevated px-3 py-2 shadow-2xl shadow-black/60 ring-1 ring-bx-red/15"
          role="alert"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-bx-red">{t.title}</p>
              <p className="mt-0.5 text-[12px] text-bx-secondary">{t.message}</p>
            </div>
            <button
              type="button"
              className="app-no-drag -mt-0.5 rounded-md px-2 py-1 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary"
              onClick={() => dismiss(t.id)}
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
})
