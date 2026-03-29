import { memo, useMemo } from 'react'
import type { MarketSocketSlice, RealtimeConnectionStatus } from '../hooks/useRealtimePrice'

export type ConnectionStatusDotProps = {
  status: RealtimeConnectionStatus
  spot: MarketSocketSlice
  futures: MarketSocketSlice
  className?: string
}

function buildTooltip(
  status: RealtimeConnectionStatus,
  spot: MarketSocketSlice,
  futures: MarketSocketSlice,
): string {
  const lines: string[] = []
  switch (status) {
    case 'live':
      lines.push('Realtime: đang nhận dữ liệu Binance.')
      break
    case 'connecting':
      lines.push('Đang kết nối WebSocket…')
      break
    case 'reconnecting':
      lines.push('Mất kết nối — đang kết nối lại. Giá hiển thị có thể chậm vài giây.')
      break
    case 'error':
      lines.push('Có lỗi kết nối — kiểm tra mạng hoặc chờ thử lại.')
      break
    default:
      lines.push('Trạng thái không xác định.')
  }
  if (spot.streams.length > 0) {
    lines.push(
      `Spot (${spot.streams.length} stream): ${spot.status}${
        spot.lastError ? ` — ${spot.lastError}` : ''
      }`,
    )
  }
  if (futures.streams.length > 0) {
    lines.push(
      `Futures (${futures.streams.length} stream): ${futures.status}${
        futures.lastError ? ` — ${futures.lastError}` : ''
      }`,
    )
  }
  return lines.join('\n')
}

export const ConnectionStatusDot = memo(function ConnectionStatusDot({
  status,
  spot,
  futures,
  className = '',
}: ConnectionStatusDotProps) {
  const title = useMemo(
    () => buildTooltip(status, spot, futures),
    [status, spot, futures],
  )

  const color =
    status === 'live'
      ? 'bg-emerald-400 shadow-emerald-400/50'
      : status === 'error'
        ? 'bg-rose-500 shadow-rose-500/45'
        : 'bg-amber-400 shadow-amber-400/40'

  const motion =
    status === 'reconnecting'
      ? 'animate-pulse motion-reduce:animate-none'
      : status === 'connecting'
        ? 'animate-pulse [animation-duration:1.4s] motion-reduce:animate-none'
        : ''

  const ring =
    status === 'live'
      ? 'ring-emerald-400/35'
      : status === 'error'
        ? 'ring-rose-400/40'
        : 'ring-amber-400/35'

  return (
    <span
      className={`inline-flex shrink-0 ${className}`.trim()}
      title={title}
      role="img"
      aria-label={title.replace(/\n/g, '. ')}
    >
      <span
        className={`inline-block size-2.5 rounded-full shadow-md ring-1 ${ring} ${color} ${motion}`.trim()}
      />
    </span>
  )
})
