import { memo } from 'react'

export type StaleBannerProps = {
  /** Hiện cảnh báo (ngoại_tuyến hoặc dữ liệu cache) */
  show: boolean
  offline: boolean
  /** Thời điểm cache (ms) */
  cachedAt: number | null
  /** Đang fetch lại khi đã stale và còn online */
  reconnecting: boolean
  /** Nút làm mới thủ công (kim loại / FX cache) */
  onManualRefresh?: () => void
}

function formatCacheTime(ms: number): string {
  return new Date(ms).toLocaleString('vi-VN')
}

export const StaleBanner = memo(function StaleBanner({
  show,
  offline,
  cachedAt,
  reconnecting,
  onManualRefresh,
}: StaleBannerProps) {
  if (!show) return null

  const phút =
    cachedAt != null
      ? Math.max(1, Math.round((Date.now() - cachedAt) / 60_000))
      : null

  const text = offline
    ? 'Đang ngoại tuyến — hiển thị dữ liệu đã lưu nếu có.'
    : cachedAt != null
      ? `Dữ liệu từ ${formatCacheTime(cachedAt)} — Đang tải lại...`
      : phút != null
        ? `Dữ liệu từ ~${phút} phút trước — Đang tải lại...`
        : 'Đang tải lại...'

  const showSpinner = reconnecting && !offline

  return (
    <div
      className="app-no-drag flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-950/45 app-pad-md text-meta leading-snug text-amber-100/95 shadow-sm transition-opacity duration-200"
      role="status"
    >
      {showSpinner ? (
        <span
          className="inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-amber-400/50 border-t-transparent"
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 flex-1">{text}</span>
      {onManualRefresh ? (
        <button
          type="button"
          className="app-no-drag shrink-0 rounded-md border border-amber-500/50 bg-amber-900/50 px-2 py-0.5 text-meta font-medium text-amber-50 transition-colors hover:border-amber-400/70 hover:bg-amber-900/70"
          onClick={() => onManualRefresh()}
        >
          Làm mới
        </button>
      ) : null}
    </div>
  )
})
