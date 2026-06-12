import { memo, useEffect, useRef, useState, type ReactNode } from 'react'

export type RefreshButtonProps = {
  onClick: () => void
  /** Đang tải — label transparent + spinner đè giữa, disable nhưng KHÔNG mờ nút */
  loading: boolean
  /** Shell classes giữ theo ngữ cảnh đặt nút (border/bg/padding hiện có) */
  className?: string
  title?: string
  /** Label; bỏ trống = nút icon-only */
  children?: ReactNode
  'aria-label'?: string
}

const DONE_FLASH_MS = 1000

/**
 * Pattern loading chung cho mọi nút làm mới (Phase 4):
 * idle (icon vòng xoay + label) → loading (label trong suốt, spinner accent
 * đè giữa, giữ nguyên bề rộng) → done (flash check xanh ~1s, không toast).
 * Spinner lấy accent ngữ cảnh qua --app-accent.
 */
export const RefreshButton = memo(function RefreshButton({
  onClick,
  loading,
  className = '',
  title,
  children,
  'aria-label': ariaLabel,
}: RefreshButtonProps) {
  const [done, setDone] = useState(false)
  const prevLoading = useRef(loading)

  useEffect(() => {
    if (prevLoading.current && !loading) {
      // setTimeout 0: tránh setState đồng bộ trong effect (react-hooks rule)
      const t0 = window.setTimeout(() => setDone(true), 0)
      const t1 = window.setTimeout(() => setDone(false), DONE_FLASH_MS)
      prevLoading.current = loading
      return () => {
        window.clearTimeout(t0)
        window.clearTimeout(t1)
      }
    }
    prevLoading.current = loading
  }, [loading])

  return (
    <button
      type="button"
      className={`app-no-drag relative ${className} ${done ? 'app-refresh-done' : ''}`.trim()}
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      aria-label={ariaLabel}
      title={title}
    >
      <span
        className={`inline-flex items-center justify-center gap-1.5 transition-opacity duration-150 ${
          loading ? 'opacity-0' : ''
        }`}
      >
        {done ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-profit"
            aria-hidden
          >
            <path d="M5 13l4 4 10-11" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        )}
        {children}
      </span>
      {loading ? (
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <span className="app-spinner" />
        </span>
      ) : null}
    </button>
  )
})
