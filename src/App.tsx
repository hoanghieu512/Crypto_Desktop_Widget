import { useCallback, useEffect, useState } from 'react'
import { FormatProvider } from './providers/FormatProvider'
import { FormatControls } from './components/FormatControls'
import { PreciousMetalsPanel } from './components/PreciousMetalsPanel'
import { SilverPanel } from './components/SilverPanel'
import { WatchlistDashboard } from './components/WatchlistDashboard'

type Tab = 'crypto' | 'gold' | 'silver'

function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)
}

export default function App() {
  const [tab, setTab] = useState<Tab>('crypto')
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const electron = isElectron()

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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/50">
        <header
          className={`app-drag grid h-14 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-2 ${
            electron ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[auto_minmax(0,1fr)]'
          }`}
        >
          <nav className="app-no-drag flex shrink-0 items-center gap-1" aria-label="Tab chính">
            <button
              type="button"
              onClick={() => setTab('crypto')}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === 'crypto'
                  ? 'bg-violet-500/20 text-violet-100'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              Crypto
            </button>
            <button
              type="button"
              onClick={() => setTab('gold')}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === 'gold'
                  ? 'bg-amber-500/15 text-amber-100'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              Vàng
            </button>
            <button
              type="button"
              onClick={() => setTab('silver')}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === 'silver'
                  ? 'bg-slate-500/20 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
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
                className={`flex h-8 w-9 items-center justify-center rounded-lg hover:bg-slate-800 ${
                  alwaysOnTop ? 'text-amber-300' : 'text-slate-500'
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
                className="flex h-8 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                onClick={() => window.electronAPI?.minimize()}
              >
                ─
              </button>
              <button
                type="button"
                aria-label="Đóng"
                className="flex h-8 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-200"
                onClick={() => window.electronAPI?.close()}
              >
                ✕
              </button>
            </div>
          ) : null}
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {tab === 'crypto' ? (
            <WatchlistDashboard />
          ) : tab === 'gold' ? (
            <PreciousMetalsPanel active={tab === 'gold'} />
          ) : (
            <SilverPanel active={tab === 'silver'} />
          )}
        </main>

        {electron ? (
          <p className="app-drag shrink-0 border-t border-slate-800/80 px-3 py-1.5 text-center text-[10px] text-slate-600">
            Kéo vùng tiêu đề (không phải nút điều khiển giá) để di chuyển · nút ghim luôn trên cùng
          </p>
        ) : (
          <p className="app-no-drag shrink-0 border-t border-slate-800/80 px-3 py-1.5 text-center text-[10px] text-slate-600">
            Desktop: <span className="font-mono text-slate-500">npm run dev:electron</span>
          </p>
        )}
      </div>
    </FormatProvider>
  )
}
