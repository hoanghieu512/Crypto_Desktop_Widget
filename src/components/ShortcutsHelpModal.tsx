import { memo } from 'react'

export type ShortcutsHelpModalProps = {
  open: boolean
  onClose: () => void
}

function Key({ children }: { children: string }) {
  return (
    <span className="rounded-md border border-bx-border-medium bg-bx-input px-2 py-1 font-mono text-[12px] text-bx-primary">
      {children}
    </span>
  )
}

export const ShortcutsHelpModal = memo(function ShortcutsHelpModal({ open, onClose }: ShortcutsHelpModalProps) {
  if (!open) return null

  return (
    <div className="pointer-events-auto fixed inset-0 z-[250] overflow-hidden" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="absolute left-1/2 top-[12px] w-[min(520px,calc(100%-24px))] -translate-x-1/2 rounded-2xl border border-white/[0.08] bg-bx-surface shadow-2xl shadow-black/60 ring-1 ring-black/30">
        <div className="flex items-start justify-between gap-3 border-b border-bx-border-subtle px-4 py-3">
          <div className="min-w-0">
            <p className="text-label font-semibold text-bx-primary">Keyboard Shortcuts</p>
            <p className="mt-0.5 text-[11px] text-bx-muted">Power user navigation & actions</p>
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

        <div className="px-4 py-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-meta font-semibold uppercase tracking-wide text-bx-muted">Navigation</p>
              <div className="mt-2 space-y-2 text-[12px] text-bx-secondary">
                <div className="flex items-center justify-between gap-3">
                  <Key>1</Key>
                  <span>Crypto</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Key>2</Key>
                  <span>Vàng</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Key>3</Key>
                  <span>Bạc</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-meta font-semibold uppercase tracking-wide text-bx-muted">Panels</p>
              <div className="mt-2 space-y-2 text-[12px] text-bx-secondary">
                <div className="flex items-center justify-between gap-3">
                  <Key>P</Key>
                  <span>Toggle Portfolio</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Key>A</Key>
                  <span>Open Alerts</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Key>Esc</Key>
                  <span>Close panel</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-bx-border-subtle pt-4">
            <p className="text-meta font-semibold uppercase tracking-wide text-bx-muted">Actions</p>
            <div className="mt-2 grid grid-cols-1 gap-2 text-[12px] text-bx-secondary sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <Key>R</Key>
                <span>Refresh current tab</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Key>/</Key>
                <span>Focus search (Crypto)</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Key>?</Key>
                <span>Show help</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

