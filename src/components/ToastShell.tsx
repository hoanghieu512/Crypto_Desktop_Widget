import { memo, type ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

/**
 * Màu type lấy trong hệ app — không du nhập xanh dương:
 * success = up #26a17b · error = down/red · warning = gold · info/alert = teal
 * (alert giá dùng teal cố định, không theo accent tab hiện hành).
 */
const typeBar: Record<ToastType, string> = {
  success: 'bg-bx-green',
  error: 'bg-bx-red',
  warning: 'bg-bx-yellow',
  info: 'bg-accent-crypto',
}

const typeIconColor: Record<ToastType, string> = {
  success: 'text-bx-green',
  error: 'text-bx-red',
  warning: 'text-bx-yellow',
  info: 'text-accent-crypto',
}

function TypeIcon({ type }: { type: ToastType }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (type === 'success') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
      </svg>
    )
  }
  if (type === 'error') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v6M12 16.5v.5" />
      </svg>
    )
  }
  if (type === 'warning') {
    return (
      <svg {...common}>
        <path d="M12 4l9 16H3z" />
        <path d="M12 10v4M12 16.8v.4" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5v.5" />
    </svg>
  )
}

export type ToastShellProps = {
  type: ToastType
  title: string
  message?: ReactNode
  onClose: () => void
  /** 0 = mới nhất (trước); càng lớn càng thu nhỏ/mờ về sau */
  depth?: number
  role?: 'alert' | 'status'
}

/** Visual chung cho AppErrorToasts + AlertToast (Phase 4) — engine giữ nguyên. */
export const ToastShell = memo(function ToastShell({
  type,
  title,
  message,
  onClose,
  depth = 0,
  role = 'status',
}: ToastShellProps) {
  return (
    <div
      className="app-toast-enter pointer-events-auto relative overflow-hidden rounded-[10px] border border-bx-border-subtle bg-bx-surface py-2 pl-3 pr-2 shadow-2xl shadow-black/60 transition-[transform,opacity] duration-300"
      style={
        depth > 0
          ? { transform: `scale(${1 - depth * 0.04})`, opacity: Math.max(0.45, 1 - depth * 0.25) }
          : undefined
      }
      role={role}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${typeBar[type]}`} />
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 ${typeIconColor[type]}`}>
          <TypeIcon type={type} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-bx-primary">{title}</p>
          {message ? <p className="mt-0.5 text-[11px] leading-snug text-bx-secondary">{message}</p> : null}
        </div>
        <button
          type="button"
          className="app-no-drag -mt-0.5 shrink-0 rounded-md p-1.5 text-bx-muted transition-colors hover:bg-bx-elevated hover:text-bx-primary"
          onClick={onClose}
          aria-label="Đóng"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
})
