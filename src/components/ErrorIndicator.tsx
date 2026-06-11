import { useState } from 'react'

export type ErrorIndicatorProps = {
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorIndicator({ message, onRetry, className = '' }: ErrorIndicatorProps) {
  const [open, setOpen] = useState(false)
  return (
    <span className={`relative inline-flex items-center ${className}`.trim()}>
      <button
        type="button"
        className="app-no-drag inline-flex size-6 items-center justify-center rounded text-amber-400/90 hover:bg-bx-elevated hover:text-amber-400"
        title={message}
        aria-label={message}
        onClick={() => {
          if (onRetry) onRetry()
          else setOpen((v) => !v)
        }}
      >
        <span className="text-sm leading-none" aria-hidden>
          ⚠
        </span>
      </button>
      {open && !onRetry ? (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 max-w-[200px] -translate-x-1/2 rounded border border-bx-border-medium bg-bx-surface px-2 py-1 text-[10px] text-bx-secondary shadow-lg">
          {message}
        </span>
      ) : null}
    </span>
  )
}
