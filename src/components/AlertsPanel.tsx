import { memo, useMemo, useState } from 'react'
import type { PriceAlert } from '../types/alerts'
import { AddAlertForm } from './AddAlertForm'
import { Skeleton, SkeletonText } from './Skeleton'

export type AlertsPanelProps = {
  open: boolean
  onClose: () => void
  /** False until alerts are read from storage (avoid empty flash) */
  storageHydrated?: boolean
  alerts: PriceAlert[]
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  onAdd: (data: { symbol: string; condition: 'above' | 'below'; targetPrice: number }) => void
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
  onReset: (id: string) => void
  prefill?: { symbol?: string; currentPrice?: number | null }
}

function fmtAlert(a: PriceAlert): string {
  const cond = a.condition === 'above' ? 'Above' : 'Below'
  return `${cond} ${a.targetPrice}`
}

export const AlertsPanel = memo(function AlertsPanel(props: AlertsPanelProps) {
  const [adding, setAdding] = useState(false)
  const pending = useMemo(() => props.alerts.filter((a) => !a.triggered), [props.alerts])
  const triggered = useMemo(() => props.alerts.filter((a) => a.triggered), [props.alerts])
  const storageReady = props.storageHydrated !== false

  if (!props.open) return null

  return (
    <div className="pointer-events-auto fixed inset-0 z-[230] overflow-hidden" role="dialog" aria-modal="true" aria-label="Price alerts">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-label="Close"
        onClick={props.onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-white/[0.08] bg-bx-base shadow-2xl shadow-black/70 ring-1 ring-black/40 sm:w-2/5 sm:min-w-80">
        <div className="flex items-center justify-between gap-2 border-b border-bx-border-subtle bg-bx-surface px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-symbol font-semibold text-bx-primary">Price Alerts</p>
            <p className="truncate text-meta text-bx-muted">Triggers on live prices while Crypto tab is open</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={!storageReady}
              className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-3 py-2 text-label font-semibold text-bx-secondary hover:text-bx-primary disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => setAdding(true)}
            >
              Add
            </button>
            <button
              type="button"
              className="app-no-drag flex size-9 items-center justify-center rounded-lg text-bx-secondary hover:bg-bx-elevated hover:text-bx-primary"
              aria-label="Close"
              onClick={props.onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-bx-border-subtle bg-bx-base px-3 py-2">
          <span className="text-[12px] font-medium text-bx-secondary">Sound</span>
          <button
            type="button"
            className={`app-no-drag rounded-lg border border-bx-border-medium px-3 py-1.5 text-[12px] font-semibold ${
              props.soundEnabled ? 'bg-bx-elevated text-bx-primary' : 'bg-bx-input text-bx-secondary hover:text-bx-primary'
            }`}
            onClick={() => props.setSoundEnabled(!props.soundEnabled)}
          >
            {props.soundEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {!storageReady ? (
            <div className="app-vstack-md" aria-busy="true" aria-label="Đang tải cảnh báo">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-bx-border-subtle bg-bx-surface/60 px-3 py-3">
                  <div className="flex justify-between gap-2">
                    <SkeletonText width="40%" />
                    <Skeleton width={56} height={24} rounded="md" />
                  </div>
                  <SkeletonText width="75%" className="mt-2" />
                </div>
              ))}
            </div>
          ) : null}
          {storageReady && adding ? (
            <div className="rounded-2xl border border-bx-border-subtle bg-bx-surface/60 p-3">
              <AddAlertForm
                symbol={props.prefill?.symbol}
                currentPrice={props.prefill?.currentPrice ?? null}
                onCancel={() => setAdding(false)}
                onSubmit={(data) => {
                  props.onAdd(data)
                  setAdding(false)
                }}
              />
            </div>
          ) : null}

          {storageReady ? (
          <div className="mt-3">
            <p className="text-meta font-semibold uppercase tracking-wide text-bx-muted">Pending</p>
            {pending.length === 0 ? (
              <p className="mt-2 text-[12px] text-bx-secondary">No pending alerts.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {pending.map((a) => (
                  <li key={a.id} className="rounded-xl border border-bx-border-subtle bg-bx-surface/60 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12px] font-semibold text-bx-primary">{a.symbol}</p>
                        <p className="mt-0.5 text-[12px] text-bx-secondary">{fmtAlert(a)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-2 py-1 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary"
                          onClick={() => props.onToggle(a.id, !a.enabled)}
                          title={a.enabled ? 'Disable' : 'Enable'}
                        >
                          {a.enabled ? '🔔' : '🔕'}
                        </button>
                        <button
                          type="button"
                          className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-2 py-1 text-[12px] font-semibold text-bx-secondary hover:border-bx-red/40 hover:text-bx-red"
                          onClick={() => props.onDelete(a.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          ) : null}

          {storageReady ? (
          <div className="mt-4">
            <p className="text-meta font-semibold uppercase tracking-wide text-bx-muted">Triggered</p>
            {triggered.length === 0 ? (
              <p className="mt-2 text-[12px] text-bx-secondary">No triggered alerts.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {triggered.map((a) => (
                  <li key={a.id} className="rounded-xl border border-bx-border-subtle bg-bx-surface/40 px-3 py-2 opacity-80">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12px] font-semibold text-bx-primary">{a.symbol}</p>
                        <p className="mt-0.5 text-[12px] text-bx-secondary">{fmtAlert(a)}</p>
                        {a.triggeredAt ? (
                          <p className="mt-1 text-[11px] text-bx-muted">
                            Triggered: {new Date(a.triggeredAt).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-2 py-1 text-[12px] font-semibold text-bx-secondary hover:text-bx-primary"
                          onClick={() => props.onReset(a.id)}
                          title="Reset"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className="app-no-drag rounded-lg border border-bx-border-medium bg-bx-input px-2 py-1 text-[12px] font-semibold text-bx-secondary hover:border-bx-red/40 hover:text-bx-red"
                          onClick={() => props.onDelete(a.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
})

