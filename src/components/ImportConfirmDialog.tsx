import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ImportPreview } from '../utils/exportImport'
import { applyImportReplaceAll } from '../utils/exportImport'

export type ImportConfirmDialogProps = {
  open: boolean
  preview: ImportPreview | null
  onClose: () => void
}

export function ImportConfirmDialog({ open, preview, onClose }: ImportConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !preview) return null

  const parts: string[] = [
    `${preview.watchlistCount} watchlist items`,
    `${preview.portfolioCount} manual positions`,
    `${preview.alertsCount} alerts`,
  ]
  if (preview.hasSimulator) parts.push('simulator state')
  if (preview.hasAlertSettings) parts.push('alert settings')

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[240] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-backup-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="absolute left-1/2 top-[12px] w-[min(400px,calc(100%-24px))] -translate-x-1/2 rounded-2xl border border-white/[0.08] bg-bx-surface shadow-2xl shadow-black/60 ring-1 ring-black/30"
      >
        <div className="app-panel app-pad-md">
          <h2 id="import-backup-title" className="text-symbol font-semibold text-bx-primary">
            Import Backup
          </h2>
          <p className="mt-2 break-all text-meta text-bx-secondary">
            <span className="font-semibold text-bx-primary">File: </span>
            {preview.fileName}
          </p>
          <p className="mt-3 text-label text-bx-secondary">
            Contains: {parts.join(', ')}.
          </p>
          <p className="mt-3 rounded-xl border border-bx-yellow/35 bg-bx-yellow/10 px-3 py-2 text-[12px] text-bx-secondary">
            This replaces watchlist, manual portfolio, price alerts, alert settings, and simulator data on this device.
            Synced Binance positions are not stored in the backup and will not be changed here.
          </p>
          <p className="mt-2 text-[12px] font-semibold text-loss">
            This will replace your current data. This action cannot be undone.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-3 py-2 text-label font-semibold text-bx-secondary hover:text-bx-primary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="app-no-drag rounded-lg bg-bx-yellow px-3 py-2 text-label font-semibold text-bx-add-fg hover:opacity-95"
              onClick={() => {
                applyImportReplaceAll(preview.data)
              }}
            >
              Import &amp; Replace
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
