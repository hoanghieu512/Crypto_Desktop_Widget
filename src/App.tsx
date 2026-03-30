import { useCallback, useEffect, useState } from 'react'
import { FormatProvider } from './providers/FormatProvider'
import { FormatControls } from './components/FormatControls'
import { PreciousMetalsPanel } from './components/PreciousMetalsPanel'
import { SilverPanel } from './components/SilverPanel'
import { WatchlistDashboard } from './components/WatchlistDashboard'
import type { RealtimeConnectionStatus } from './hooks/useRealtimePrice'

type Tab = 'crypto' | 'gold' | 'silver'

function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)
}

export default function App() {
  const [tab, setTab] = useState<Tab>('crypto')
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const [cryptoConn, setCryptoConn] = useState<RealtimeConnectionStatus | null>(null)
  const electron = isElectron()

  useEffect(() => {
    if (tab !== 'crypto') setCryptoConn(null)
  }, [tab])

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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-bx-border-medium bg-bx-base shadow-2xl shadow-black/50">
        <header
          className={`app-drag grid h-14 shrink-0 items-center gap-2 border-b border-bx-border-subtle bg-bx-surface px-2 ${
            electron ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[auto_minmax(0,1fr)]'
          }`}
        >
          <nav
            className="app-no-drag flex h-full shrink-0 items-stretch gap-1"
            aria-label="Tab chính"
          >
            <button
              type="button"
              onClick={() => setTab('crypto')}
              className={`flex items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors duration-150 ${
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
              className={`flex items-center border-b-2 px-3 text-sm font-medium transition-colors duration-150 ${
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
              className={`flex items-center border-b-2 px-3 text-sm font-medium transition-colors duration-150 ${
                tab === 'silver'
                  ? 'border-bx-yellow text-bx-yellow'
                  : 'border-transparent text-bx-secondary hover:text-bx-primary'
              }`}
            >
              Bạc
            </button>
          </nav>

          <div className="app-no-drag flex min-w-0 items-center justify-center overflow-x-auto overflow-y-hidden">
            <FormatControls />
          </div>

          {electron ? (
            <div className="app-no-drag flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label={alwaysOnTop ? 'Tắt luôn trên cùng' : 'Bật luôn trên cùng'}
                title={alwaysOnTop ? 'Luôn trên cùng: bật' : 'Luôn trên cùng: tắt'}
                className={`flex h-8 w-9 items-center justify-center rounded-lg hover:bg-bx-elevated ${
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
                className="flex h-8 w-9 items-center justify-center rounded-lg text-bx-secondary hover:bg-bx-elevated hover:text-bx-primary"
                onClick={() => window.electronAPI?.minimize()}
              >
                ─
              </button>
              <button
                type="button"
                aria-label="Đóng"
                className="flex h-8 w-9 items-center justify-center rounded-lg text-bx-secondary hover:bg-bx-red/15 hover:text-bx-red"
                onClick={() => window.electronAPI?.close()}
              >
                ✕
              </button>
            </div>
          ) : null}
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {tab === 'crypto' ? (
            <WatchlistDashboard onConnectionStatusChange={setCryptoConn} />
          ) : tab === 'gold' ? (
            <PreciousMetalsPanel active={tab === 'gold'} />
          ) : (
            <SilverPanel active={tab === 'silver'} />
          )}
        </main>

        {electron ? (
          <p className="app-drag shrink-0 border-t border-bx-border-subtle px-3 py-1.5 text-center text-[10px] text-bx-muted">
            Kéo vùng tiêu đề (không phải nút điều khiển giá) để di chuyển · nút ghim luôn trên cùng
          </p>
        ) : (
          <p className="app-no-drag shrink-0 border-t border-bx-border-subtle px-3 py-1.5 text-center text-[10px] text-bx-muted">
            Desktop: <span className="font-mono text-bx-secondary">npm run dev:electron</span>
          </p>
        )}
      </div>
    </FormatProvider>
  )
}
