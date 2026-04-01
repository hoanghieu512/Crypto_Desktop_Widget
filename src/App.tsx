import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormatProvider } from './providers/FormatProvider'
import { FormatControls } from './components/FormatControls'
import { PreciousMetalsPanel } from './components/PreciousMetalsPanel'
import { SilverPanel } from './components/SilverPanel'
import { WatchlistDashboard } from './components/WatchlistDashboard'
import { FloatingPortfolioButton } from './components/FloatingPortfolioButton'
import { PortfolioSidePanel } from './components/PortfolioSidePanel'
import type { RealtimeConnectionStatus } from './hooks/useRealtimePrice'
import { usePriceAlerts } from './hooks/usePriceAlerts'
import { AlertsPanel } from './components/AlertsPanel'
import { AlertToast } from './components/AlertToast'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal'
import { BackupImportFlash } from './components/BackupImportFlash'
import { AppErrorToasts } from './components/AppErrorToasts'

type Tab = 'crypto' | 'gold' | 'silver'

function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)
}

export default function App() {
  const [tab, setTab] = useState<Tab>('crypto')
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const [cryptoConn, setCryptoConn] = useState<RealtimeConnectionStatus | null>(null)
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [alertPrefill, setAlertPrefill] = useState<{ symbol?: string; currentPrice?: number | null }>({})
  const [alertPrices, setAlertPrices] = useState<Record<string, number | null>>({})
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [cryptoRefreshNonce, setCryptoRefreshNonce] = useState(0)
  const electron = isElectron()

  useEffect(() => {
    if (tab !== 'crypto') setCryptoConn(null)
    if (tab !== 'crypto') setPortfolioOpen(false)
    if (tab !== 'crypto') setAlertsOpen(false)
  }, [tab])

  const alerts = usePriceAlerts({ pricesBySymbol: alertPrices })

  const switchTabByIndex = useCallback((idx: number) => {
    const next: Tab = idx === 0 ? 'crypto' : idx === 1 ? 'gold' : 'silver'
    setTab(next)
  }, [])

  const closePanels = useCallback(() => {
    setShortcutsOpen(false)
    setAlertsOpen(false)
    setPortfolioOpen(false)
    // Simulator already listens to Escape internally.
  }, [])

  const focusSearch = useCallback(() => {
    if (tab !== 'crypto') {
      setTab('crypto')
      // let next frame focus
      requestAnimationFrame(() => {
        const el = document.getElementById('wl-symbol-input') as HTMLInputElement | null
        el?.focus()
        el?.select()
      })
      return
    }
    const el = document.getElementById('wl-symbol-input') as HTMLInputElement | null
    el?.focus()
    el?.select()
  }, [tab])

  const refreshCurrent = useCallback(() => {
    if (tab === 'crypto') {
      setCryptoRefreshNonce((n) => n + 1)
      return
    }
    window.dispatchEvent(new CustomEvent('app:refresh', { detail: { tab } }))
  }, [tab])

  const handlers = useMemo(
    () => ({
      onSwitchTab: (i: number) => switchTabByIndex(i),
      onTogglePortfolio: () => {
        if (tab !== 'crypto') setTab('crypto')
        setPortfolioOpen((v) => !v)
      },
      onClosePanel: () => closePanels(),
      onOpenAlerts: () => {
        if (tab !== 'crypto') setTab('crypto')
        setAlertPrefill({})
        setAlertsOpen(true)
      },
      onRefresh: () => refreshCurrent(),
      onFocusSearch: () => focusSearch(),
      onShowHelp: () => setShortcutsOpen(true),
    }),
    [closePanels, focusSearch, refreshCurrent, switchTabByIndex, tab],
  )

  useKeyboardShortcuts(handlers, true)

  useEffect(() => {
    if (!electron || !window.electronAPI?.isAlwaysOnTop) return
    void window.electronAPI.isAlwaysOnTop().then(setAlwaysOnTop)
  }, [electron])

  const toggleAlwaysOnTop = useCallback(() => {
    const api = window.electronAPI
    if (!api?.setAlwaysOnTop) return
    const next = !alwaysOnTop
    void api.setAlwaysOnTop(next).then((v) => setAlwaysOnTop(Boolean(v)))
  }, [alwaysOnTop])

  return (
    <FormatProvider>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-bx-border-medium bg-bx-base shadow-2xl shadow-black/50">
        <header className="app-drag flex min-w-0 shrink-0 flex-col gap-1.5 border-b border-bx-border-subtle bg-bx-surface px-2 py-2 max-[299px]:gap-1 max-[299px]:px-1.5 max-[299px]:py-1.5 min-[361px]:gap-2 min-[361px]:px-3">
          <div className="app-no-drag flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 max-[299px]:gap-x-1.5">
            <nav
              className="flex min-w-0 flex-wrap items-stretch gap-1"
              aria-label="Tab chính"
            >
            <button
              type="button"
              onClick={() => setTab('crypto')}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-3 ${
                tab === 'crypto'
                  ? 'border-bx-yellow text-bx-yellow'
                  : 'border-transparent text-bx-secondary hover:text-bx-primary'
              }`}
            >
              {tab === 'crypto' && cryptoConn === 'live' ? (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-bx-green"
                  title="Realtime: live"
                  aria-hidden
                />
              ) : null}
              Crypto
            </button>
            <button
              type="button"
              onClick={() => setTab('gold')}
              className={`flex shrink-0 items-center border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-3 ${
                tab === 'gold'
                  ? 'border-bx-yellow text-bx-yellow'
                  : 'border-transparent text-bx-secondary hover:text-bx-primary'
              }`}
            >
              Vàng
            </button>
            <button
              type="button"
              onClick={() => setTab('silver')}
              className={`flex shrink-0 items-center border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-3 ${
                tab === 'silver'
                  ? 'border-bx-yellow text-bx-yellow'
                  : 'border-transparent text-bx-secondary hover:text-bx-primary'
              }`}
            >
              Bạc
            </button>
            </nav>

            {electron ? (
              <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label={alwaysOnTop ? 'Tắt luôn trên cùng' : 'Bật luôn trên cùng'}
                title={alwaysOnTop ? 'Luôn trên cùng: bật' : 'Luôn trên cùng: tắt'}
                className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-bx-elevated ${
                  alwaysOnTop ? 'text-bx-yellow' : 'text-bx-muted'
                }`}
                onClick={toggleAlwaysOnTop}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1z" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Thu nhỏ"
                className="flex h-8 w-9 shrink-0 items-center justify-center rounded-lg text-bx-secondary hover:bg-bx-elevated hover:text-bx-primary"
                onClick={() => window.electronAPI?.minimize()}
              >
                ─
              </button>
              <button
                type="button"
                aria-label="Đóng"
                className="flex h-8 w-9 shrink-0 items-center justify-center rounded-lg text-bx-secondary hover:bg-bx-red/15 hover:text-bx-red"
                onClick={() => window.electronAPI?.close()}
              >
                ✕
              </button>
              </div>
            ) : null}
          </div>

          <div className="app-no-drag flex min-w-0 items-center justify-center border-t border-bx-border-subtle/80 pt-1.5 max-[299px]:pt-1 min-[361px]:pt-2">
            <div className="min-w-0 overflow-x-auto overflow-y-hidden">
              <FormatControls variant={tab === 'crypto' ? 'crypto' : 'metals'} />
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {tab === 'crypto' ? (
            <WatchlistDashboard
              onConnectionStatusChange={setCryptoConn}
              onPricesBySymbolChange={setAlertPrices}
              onQuickAddAlert={(symbol, currentPrice) => {
                setAlertPrefill({ symbol, currentPrice })
                setAlertsOpen(true)
              }}
              refreshNonce={cryptoRefreshNonce}
            />
          ) : tab === 'gold' ? (
            <PreciousMetalsPanel active={tab === 'gold'} />
          ) : (
            <SilverPanel active={tab === 'silver'} />
          )}
        </main>

        {tab === 'crypto' ? (
          <>
            <button
              type="button"
              className="app-no-drag fixed bottom-[84px] right-5 z-[130] flex items-center gap-2 rounded-full border border-bx-border-medium bg-bx-elevated px-3 py-2 text-[12px] font-semibold text-bx-primary shadow-lg shadow-black/50 hover:bg-bx-surface"
              onClick={() => {
                setAlertPrefill({})
                setAlertsOpen(true)
              }}
              title="Price alerts"
            >
              <span aria-hidden>🔔</span>
              Alerts
              {alerts.activeEnabledCount > 0 ? (
                <span className="ml-1 rounded-full bg-bx-yellow px-2 py-0.5 text-[11px] font-semibold text-bx-add-fg">
                  {alerts.activeEnabledCount}
                </span>
              ) : null}
            </button>
            <FloatingPortfolioButton onClick={() => setPortfolioOpen(true)} />
            <PortfolioSidePanel isOpen={portfolioOpen} onClose={() => setPortfolioOpen(false)} />
          </>
        ) : null}

        <AlertsPanel
          open={alertsOpen}
          onClose={() => setAlertsOpen(false)}
          storageHydrated={alerts.storageHydrated}
          alerts={alerts.alerts}
          soundEnabled={alerts.settings.soundEnabled}
          setSoundEnabled={alerts.setSoundEnabled}
          onAdd={alerts.addAlert}
          onToggle={(id, enabled) => alerts.updateAlert(id, { enabled })}
          onDelete={alerts.deleteAlert}
          onReset={alerts.resetAlert}
          prefill={alertPrefill}
        />

        <AlertToast items={alerts.toasts} onDismiss={alerts.dismissToast} />
        <AppErrorToasts />

        <ShortcutsHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <BackupImportFlash />

        {electron ? (
          <p className="app-drag min-w-0 shrink-0 border-t border-bx-border-subtle px-2 py-1.5 text-center text-[10px] leading-tight break-words text-bx-muted">
            Kéo vùng tiêu đề (không phải nút điều khiển giá) để di chuyển · nút ghim luôn trên cùng
          </p>
        ) : (
          <p className="app-no-drag min-w-0 shrink-0 border-t border-bx-border-subtle px-2 py-1.5 text-center text-[10px] leading-tight text-bx-muted">
            Desktop: <span className="font-mono text-bx-secondary">npm run dev:electron</span>
          </p>
        )}
      </div>
    </FormatProvider>
  )
}
