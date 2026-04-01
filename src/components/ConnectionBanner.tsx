import { useState } from 'react'

export type ConnectionBannerProps = {
  variant: 'connecting' | 'reconnecting' | 'error'
  message: string
  detail?: string | null
  onRetry?: () => void
  dismissible?: boolean
}

export function ConnectionBanner({
  variant,
  message,
  detail,
  onRetry,
  dismissible = false,
}: ConnectionBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const tone =
    variant === 'error'
      ? 'border-bx-red/50 bg-bx-red/10 text-bx-primary'
      : 'border-bx-yellow/45 bg-bx-yellow/10 text-bx-primary'

  return (
    <div
      className={`flex min-h-[2.5rem] shrink-0 items-center justify-center gap-3 border-b px-3 py-2 text-center text-[12px] font-medium ${tone}`}
      role="status"
    >
      {variant !== 'error' ? (
        <span
          className="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-bx-yellow/40 border-t-bx-yellow"
          aria-hidden
        />
      ) : (
        <span className="shrink-0 text-bx-red" aria-hidden>
          ⚠️
        </span>
      )}
      <span className="min-w-0 flex-1">
        {message}
        {detail ? <span className="mt-0.5 block text-[11px] font-normal text-bx-secondary">{detail}</span> : null}
      </span>
      {onRetry ? (
        <button
          type="button"
          className="app-no-drag shrink-0 rounded-md border border-bx-border-medium bg-bx-input px-2.5 py-1 text-[11px] font-semibold text-bx-secondary hover:text-bx-primary"
          onClick={onRetry}
        >
          Thử lại
        </button>
      ) : null}
      {dismissible ? (
        <button
          type="button"
          className="app-no-drag shrink-0 rounded p-1 text-bx-muted hover:text-bx-primary"
          aria-label="Đóng"
          onClick={() => setDismissed(true)}
        >
          ✕
        </button>
      ) : null}
    </div>
  )
}
