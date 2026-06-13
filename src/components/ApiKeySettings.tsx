import { memo, useMemo, useState } from 'react'
import { useBinanceSync } from '../hooks/useBinanceSync'

export type ApiKeySettingsProps = {
  open: boolean
  onClose: () => void
  /** Only sync while portfolio panel is open */
  enabled: boolean
}

export const ApiKeySettings = memo(function ApiKeySettings({ open, onClose, enabled }: ApiKeySettingsProps) {
  const sync = useBinanceSync(enabled)
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [showWarning, setShowWarning] = useState(false)
  const [busy, setBusy] = useState(false)

  const connectedTone =
    sync.state.status === 'connected'
      ? 'text-bx-green'
      : sync.state.status === 'error'
        ? 'text-bx-red'
        : 'text-bx-secondary'

  const statusText =
    sync.state.status === 'connected'
      ? 'Connected'
      : sync.state.status === 'error'
        ? 'Error'
        : 'Not connected'

  const canSave = apiKey.trim().length > 10 && secretKey.trim().length > 10

  const lastSync = useMemo(() => {
    if (!sync.state.lastSyncedAt) return null
    const sec = Math.max(0, Math.floor((Date.now() - sync.state.lastSyncedAt) / 1000))
    return `${sec}s ago`
  }, [sync.state.lastSyncedAt])

  if (!open) return null

  return (
    <div className="pointer-events-auto fixed inset-0 z-[240] overflow-hidden" role="dialog" aria-modal="true" aria-label="Binance API settings">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="absolute left-1/2 top-[12px] w-[min(520px,calc(100%-24px))] -translate-x-1/2 rounded-2xl border border-white/[0.08] bg-bx-surface shadow-2xl shadow-black/60 ring-1 ring-black/30">
        <div className="flex items-start justify-between gap-3 border-b border-bx-border-subtle px-4 py-3">
          <div className="min-w-0">
            <p className="text-label font-semibold text-bx-primary">Binance Futures (Read-only)</p>
            <p className="mt-0.5 text-[11px] text-bx-muted">
              Keys are stored locally. Use a key with <span className="font-semibold text-accent">READ-ONLY</span> permissions only.
            </p>
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
          <div className="rounded-xl border border-bx-border-subtle bg-bx-base/50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-bx-muted">Security warning</p>
            <ul className="mt-2 list-disc pl-4 text-[12px] text-bx-secondary">
              <li>Only create API key with <b>Read-only</b> permission.</li>
              <li>Never enable <b>Trading</b> or <b>Withdrawal</b> permissions.</li>
              <li>Keys are used only to call Binance read endpoints in this app.</li>
            </ul>
            <p className="mt-2 text-[11px] text-bx-muted">
              Binance API management: <span className="font-mono text-bx-secondary">https://www.binance.com/en/my/settings/api-management</span>
            </p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <label className="text-meta font-medium uppercase tracking-wide text-bx-muted" htmlFor="bx-base-url">
                Endpoint
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`app-no-drag rounded-lg border px-3 py-2 text-[12px] font-semibold ${
                    sync.state.baseUrl === 'https://fapi.binance.com'
                      ? 'border-bx-border-medium bg-bx-elevated text-bx-primary'
                      : 'border-bx-border-medium bg-bx-input text-bx-secondary hover:text-bx-primary'
                  }`}
                  onClick={() => sync.setBaseUrl('https://fapi.binance.com')}
                  title="Binance Futures Mainnet"
                >
                  Mainnet
                </button>
                <button
                  type="button"
                  className={`app-no-drag rounded-lg border px-3 py-2 text-[12px] font-semibold ${
                    sync.state.baseUrl === 'https://testnet.binancefuture.com'
                      ? 'border-bx-border-medium bg-bx-elevated text-bx-primary'
                      : 'border-bx-border-medium bg-bx-input text-bx-secondary hover:text-bx-primary'
                  }`}
                  onClick={() => sync.setBaseUrl('https://testnet.binancefuture.com')}
                  title="Binance Futures Testnet"
                >
                  Testnet
                </button>
                <input
                  id="bx-base-url"
                  className="min-w-[16rem] flex-1 rounded-lg border border-bx-border-medium bg-bx-input px-2 py-2 font-mono text-xs text-bx-primary outline-none focus:ring-1 focus:ring-white/10"
                  value={sync.state.baseUrl}
                  onChange={(e) => sync.setBaseUrl(e.target.value)}
                  placeholder="https://fapi.binance.com"
                  autoComplete="off"
                />
              </div>
              <p className="mt-1 text-[11px] text-bx-muted">
                Tip: Use Testnet keys with <span className="font-mono">testnet.binancefuture.com</span>.
              </p>
            </div>
            <div className="min-w-0">
              <label className="text-meta font-medium uppercase tracking-wide text-bx-muted" htmlFor="bx-api-key">
                API Key
              </label>
              <input
                id="bx-api-key"
                className="mt-1 w-full rounded-lg border border-bx-border-medium bg-bx-input px-2 py-2 font-mono text-xs text-bx-primary outline-none focus:ring-1 focus:ring-white/10"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="..."
                autoComplete="off"
              />
            </div>
            <div className="min-w-0">
              <label className="text-meta font-medium uppercase tracking-wide text-bx-muted" htmlFor="bx-secret-key">
                Secret Key
              </label>
              <input
                id="bx-secret-key"
                className="mt-1 w-full rounded-lg border border-bx-border-medium bg-bx-input px-2 py-2 font-mono text-xs text-bx-primary outline-none focus:ring-1 focus:ring-white/10"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="..."
                autoComplete="off"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-[12px] font-medium ${connectedTone}`}>{statusText}</p>
              {sync.state.error ? <p className="mt-0.5 text-[11px] text-bx-red">{sync.state.error}</p> : null}
              {lastSync ? <p className="mt-0.5 text-[11px] text-bx-muted">Last synced: {lastSync}</p> : null}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-3 py-2 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary disabled:opacity-60"
                onClick={async () => {
                  setBusy(true)
                  try {
                    await sync.testConnection()
                  } finally {
                    setBusy(false)
                  }
                }}
                disabled={busy || !sync.state.hasCredentials}
                title={sync.state.hasCredentials ? 'Test saved keys' : 'Save keys first'}
              >
                Test connection
              </button>

              <button
                type="button"
                className="app-no-drag rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-bx-add-fg disabled:opacity-60"
                disabled={busy || !canSave}
                onClick={() => setShowWarning(true)}
              >
                Save
              </button>

              <button
                type="button"
                className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-3 py-2 text-[12px] font-semibold text-bx-secondary hover:border-bx-red/40 hover:text-bx-red disabled:opacity-60"
                disabled={busy || !sync.state.hasCredentials}
                onClick={() => {
                  const ok = window.confirm('Delete stored Binance API keys?')
                  if (ok) sync.clearCredentials()
                }}
              >
                Delete keys
              </button>
            </div>
          </div>
        </div>

        {showWarning ? (
          <div className="border-t border-bx-border-subtle bg-bx-base/40 px-4 py-3">
            <p className="text-[12px] font-semibold text-bx-primary">Confirm</p>
            <p className="mt-1 text-[12px] text-bx-secondary">
              Make sure this API key is <b>READ-ONLY</b> (no trading, no withdrawals). Continue?
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-3 py-2 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary"
                onClick={() => setShowWarning(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="app-no-drag rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-bx-add-fg"
                onClick={async () => {
                  setBusy(true)
                  try {
                    await sync.saveCredentials(apiKey, secretKey)
                    setApiKey('')
                    setSecretKey('')
                    setShowWarning(false)
                    await sync.testConnection()
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Save & test
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
})

