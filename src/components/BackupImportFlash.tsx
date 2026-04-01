import { useEffect, useState } from 'react'
import { IMPORT_FLASH_KEY } from '../utils/exportImport'

function readImportFlashOnce(): { title: string; message: string } | null {
  try {
    const raw = sessionStorage.getItem(IMPORT_FLASH_KEY)
    if (!raw) return null
    sessionStorage.removeItem(IMPORT_FLASH_KEY)
    const j = JSON.parse(raw) as { title?: string; message?: string }
    const title = typeof j.title === 'string' ? j.title : ''
    const message = typeof j.message === 'string' ? j.message : ''
    if (title && message) return { title, message }
  } catch {
    try {
      sessionStorage.removeItem(IMPORT_FLASH_KEY)
    } catch {
      /* ignore */
    }
  }
  return null
}

export function BackupImportFlash() {
  const [flash, setFlash] = useState<{ title: string; message: string } | null>(readImportFlashOnce)

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(null), 9000)
    return () => window.clearTimeout(id)
  }, [flash])

  if (!flash) return null

  return (
    <div className="pointer-events-auto fixed right-3 top-24 z-[258] flex w-[min(320px,calc(100%-24px))] flex-col gap-2">
      <div
        className="rounded-xl border border-bx-border-medium bg-bx-elevated px-3 py-2 shadow-2xl shadow-black/60"
        role="status"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-bx-primary">{flash.title}</p>
            <p className="mt-0.5 text-[12px] text-bx-secondary">{flash.message}</p>
          </div>
          <button
            type="button"
            className="app-no-drag -mt-0.5 rounded-md px-2 py-1 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary"
            onClick={() => setFlash(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
