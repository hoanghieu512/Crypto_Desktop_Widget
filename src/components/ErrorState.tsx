import type { ReactNode } from 'react'

export type ErrorStateProps = {
  title: string
  message: string
  onRetry?: () => void
  icon?: ReactNode
  compact?: boolean
  retryLabel?: string
  className?: string
}

const defaultIcon = (
  <span className="text-xl leading-none" aria-hidden>
    ⚠️
  </span>
)

export function ErrorState({
  title,
  message,
  onRetry,
  icon,
  compact = false,
  retryLabel = 'Thử lại',
  className = '',
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg border border-bx-border-medium border-l-4 border-l-bx-red bg-bx-elevated/80 px-3 py-2 text-left ${className}`.trim()}
        role="alert"
      >
        <span className="shrink-0 text-bx-yellow">{icon ?? defaultIcon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-bx-primary">{title}</p>
          <p className="text-[11px] leading-snug text-bx-secondary">{message}</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            className="app-no-drag shrink-0 rounded-md border border-bx-border-medium bg-bx-input px-2.5 py-1 text-[11px] font-semibold text-bx-secondary hover:text-bx-primary"
            onClick={onRetry}
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-bx-border-medium border-l-4 border-l-bx-red bg-bx-elevated/60 p-6 text-center ${className}`.trim()}
      role="alert"
    >
      <div className="text-bx-yellow">{icon ?? defaultIcon}</div>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-semibold text-bx-primary">{title}</p>
        <p className="text-[13px] leading-relaxed text-bx-secondary">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          className="app-no-drag rounded-md bg-bx-yellow px-4 py-2 text-[12px] font-semibold text-bx-add-fg hover:opacity-95"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
