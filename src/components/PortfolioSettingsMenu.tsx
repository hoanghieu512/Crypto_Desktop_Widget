import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImportPreview } from '../utils/exportImport'
import { buildImportPreview, exportAllData, parseBackupJson, userMessageForBackupError } from '../utils/exportImport'
import { ImportConfirmDialog } from './ImportConfirmDialog'

export type PortfolioSettingsMenuProps = {
  onOpenApiSettings: () => void
  /** Panel must be active for file IO to feel responsive */
  active: boolean
}

export function PortfolioSettingsMenu({ onOpenApiSettings, active }: PortfolioSettingsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current
      if (!el || el.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(() => setBanner(null), 4500)
    return () => window.clearTimeout(t)
  }, [banner])

  const showExportDone = useCallback(() => {
    setMenuOpen(false)
    setBanner({ kind: 'ok', message: 'Backup downloaded successfully.' })
  }, [])

  const onPickImport = useCallback(() => {
    if (!active) return
    setMenuOpen(false)
    fileRef.current?.click()
  }, [active])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    void (async () => {
      try {
        const text = await file.text()
        const backup = parseBackupJson(text)
        setImportPreview(buildImportPreview(file.name, backup))
        setImportDialogOpen(true)
      } catch (err) {
        setBanner({ kind: 'err', message: userMessageForBackupError(err) })
      }
    })()
  }, [])

  return (
    <>
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          className="app-no-drag flex h-9 w-9 items-center justify-center rounded-lg border border-bx-border-medium bg-bx-input text-bx-secondary hover:text-bx-primary"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title="Portfolio settings"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ⚙
        </button>
        {menuOpen ? (
          <div
            className="absolute right-0 top-full z-[200] mt-1 min-w-[200px] rounded-xl border border-white/[0.08] bg-bx-elevated py-1 shadow-2xl shadow-black/60 ring-1 ring-black/30"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="app-no-drag flex w-full items-center gap-2 px-3 py-2 text-left text-label text-bx-secondary hover:bg-bx-surface hover:text-bx-primary"
              onClick={() => {
                exportAllData()
                showExportDone()
              }}
            >
              📤 Export Data
            </button>
            <button
              type="button"
              role="menuitem"
              className="app-no-drag flex w-full items-center gap-2 px-3 py-2 text-left text-label text-bx-secondary hover:bg-bx-surface hover:text-bx-primary"
              onClick={onPickImport}
            >
              📥 Import Data
            </button>
            <div className="my-1 h-px bg-white/10" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="app-no-drag flex w-full items-center gap-2 px-3 py-2 text-left text-label text-bx-secondary hover:bg-bx-surface hover:text-bx-primary"
              onClick={() => {
                setMenuOpen(false)
                onOpenApiSettings()
              }}
            >
              🔑 API Settings
            </button>
          </div>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onFileChange}
      />

      <ImportConfirmDialog
        open={importDialogOpen}
        preview={importPreview}
        onClose={() => {
          setImportDialogOpen(false)
          setImportPreview(null)
        }}
      />

      {banner ? (
        <div
          className={`pointer-events-auto fixed right-3 top-14 z-[250] w-[min(320px,calc(100%-24px))] rounded-xl border px-3 py-2 shadow-2xl shadow-black/60 ${
            banner.kind === 'ok'
              ? 'border-bx-border-medium bg-bx-elevated text-bx-primary'
              : 'border-bx-red/40 bg-bx-elevated text-bx-primary'
          }`}
          role="status"
        >
          <p className="text-[12px] font-semibold">{banner.kind === 'ok' ? 'Export' : 'Import'}</p>
          <p className="mt-0.5 text-[12px] text-bx-secondary">{banner.message}</p>
        </div>
      ) : null}
    </>
  )
}
