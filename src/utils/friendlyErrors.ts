/** User-facing Vietnamese copy — avoid raw technical errors in UI */

export const ViErrors = {
  networkTitle: 'Không thể kết nối',
  networkMessage: 'Kiểm tra kết nối mạng và thử lại',
  apiTitle: 'Lỗi tải dữ liệu',
  apiMessage: 'Không thể lấy dữ liệu từ server',
  wsTitle: 'Mất kết nối realtime',
  wsReconnecting: 'Đang thử kết nối lại…',
  wsFailed: 'Kết nối realtime lỗi. Nhấn Thử lại hoặc đợi tự động kết nối lại.',
  binanceTitle: 'Lỗi Binance API',
  binanceMessage: 'API key không hợp lệ hoặc không đủ quyền',
  rateLimitTitle: 'Quá nhiều yêu cầu',
  rateLimitMessage: 'Vui lòng đợi một lát rồi thử lại',
  storageTitle: 'Lỗi lưu trữ',
  storageMessage: 'Không thể lưu dữ liệu. Bộ nhớ trình duyệt có thể đã đầy',
  emptyTitle: 'Không có dữ liệu',
  emptyMessage: 'Chưa có dữ liệu để hiển thị',
  sparklineFailed: 'Không thể tải biểu đồ ngắn',
  fundingPartial: 'Một phần dữ liệu funding chưa tải được — PnL hiển thị có thể thiếu funding',
} as const

/** Map common Binance / fetch English messages to Vietnamese for user display */
export function binanceErrorToVi(raw: string): { title: string; message: string } {
  const s = raw.toLowerCase()
  if (s.includes('rate limit') || s.includes('429') || s.includes('-1003')) {
    return { title: ViErrors.rateLimitTitle, message: ViErrors.rateLimitMessage }
  }
  if (
    s.includes('api-key') ||
    s.includes('invalid api') ||
    s.includes('2015') ||
    s.includes('2014') ||
    s.includes('unauthorized') ||
    s.includes('signature') ||
    s.includes('1022')
  ) {
    return { title: ViErrors.binanceTitle, message: ViErrors.binanceMessage }
  }
  if (s.includes('network') || s.includes('failed to fetch') || s.includes('load failed')) {
    return { title: ViErrors.networkTitle, message: ViErrors.networkMessage }
  }
  return { title: ViErrors.apiTitle, message: ViErrors.apiMessage }
}

export function classifyFetchError(_err: unknown): { title: string; message: string } {
  return { title: ViErrors.networkTitle, message: ViErrors.networkMessage }
}
