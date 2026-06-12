import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { APP_TOAST_ERROR_EVENT, type AppToastPayload } from '../utils/appToast'
import { ToastShell } from './ToastShell'

type Item = AppToastPayload & { id: string }

const AUTO_MS = 5000

/**
 * Engine giữ nguyên (event bus + 5s auto-dismiss). Phase 4 thêm:
 * visual ToastShell chung, stack thu nhỏ/mờ về sau, hover dừng đếm giờ
 * (đếm phần còn lại khi rời chuột).
 */
export const AppErrorToasts = memo(function AppErrorToasts() {
  const [items, setItems] = useState<Item[]>([])
  /** id → { timer, expireAt, remaining khi đang pause } */
  const timersRef = useRef(new Map<string, { timer: number; expireAt: number; remaining: number }>())

  const dismiss = useCallback((id: string) => {
    const t = timersRef.current.get(id)
    if (t) {
      window.clearTimeout(t.timer)
      timersRef.current.delete(id)
    }
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const schedule = useCallback(
    (id: string, ms: number) => {
      const timer = window.setTimeout(() => dismiss(id), ms)
      timersRef.current.set(id, { timer, expireAt: Date.now() + ms, remaining: ms })
    },
    [dismiss],
  )

  useEffect(() => {
    const on = (e: Event) => {
      const ce = e as CustomEvent<AppToastPayload>
      const d = ce.detail
      if (!d || d.type !== 'error') return
      const id = crypto.randomUUID()
      const next: Item = { id, type: 'error', title: d.title, message: d.message }
      setItems((prev) => [next, ...prev].slice(0, 4))
      schedule(id, AUTO_MS)
    }
    window.addEventListener(APP_TOAST_ERROR_EVENT, on as EventListener)
    return () => window.removeEventListener(APP_TOAST_ERROR_EVENT, on as EventListener)
  }, [schedule])

  const pauseAll = useCallback(() => {
    const now = Date.now()
    const next = new Map<string, { timer: number; expireAt: number; remaining: number }>()
    for (const [id, t] of timersRef.current) {
      window.clearTimeout(t.timer)
      next.set(id, { ...t, remaining: Math.max(500, t.expireAt - now) })
    }
    timersRef.current = next
  }, [])

  const resumeAll = useCallback(() => {
    const next = new Map<string, { timer: number; expireAt: number; remaining: number }>()
    for (const [id, t] of timersRef.current) {
      window.clearTimeout(t.timer)
      next.set(id, {
        timer: window.setTimeout(() => dismiss(id), t.remaining),
        expireAt: Date.now() + t.remaining,
        remaining: t.remaining,
      })
    }
    timersRef.current = next
  }, [dismiss])

  if (items.length === 0) return null

  // Render oldest → newest; toast mới overlap lên trên (zIndex tăng dần),
  // cái cũ thu nhỏ/mờ dần phía sau (depth giảm dần về 0 cho cái mới nhất).
  const ordered = [...items].reverse()

  return (
    <div
      className="pointer-events-none fixed bottom-[148px] right-3 z-[255] flex w-[min(320px,calc(100%-24px))] flex-col max-[380px]:bottom-[132px]"
      onMouseEnter={pauseAll}
      onMouseLeave={resumeAll}
    >
      {ordered.map((t, j) => (
        <div key={t.id} className={j > 0 ? 'relative -mt-7' : 'relative'} style={{ zIndex: j }}>
          <ToastShell
            type="error"
            role="alert"
            title={t.title}
            message={t.message}
            depth={ordered.length - 1 - j}
            onClose={() => dismiss(t.id)}
          />
        </div>
      ))}
    </div>
  )
})
