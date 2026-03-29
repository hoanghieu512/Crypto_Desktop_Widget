/**
 * Nhãn hiển thị theo mã niêm yết (tách khỏi JSX / hook).
 */
export const VN_GOLD_DISPLAY_LABELS = {
  BTSJC: 'Bảo Tín Mạnh Hải — SJC',
  BT9999NTT: 'Bảo Tín Mạnh Hải — 9999',
  SJL1L10: 'SJC 9999 (1 lượng / 10 chỉ)',
  VNGSJC: 'Vàng SJC (niêm yết VN)',
  DOHNL: 'DOJI Hà Nội',
  DOHCML: 'DOJI TP.HCM',
} as const satisfies Record<string, string>

export type VnGoldListingCode = keyof typeof VN_GOLD_DISPLAY_LABELS

/** Thứ tự hiển thị trong bảng */
export const VN_GOLD_ROW_ORDER: readonly VnGoldListingCode[] = [
  'BTSJC',
  'BT9999NTT',
  'SJL1L10',
  'VNGSJC',
  'DOHNL',
  'DOHCML',
]

export const VN_GOLD_ROWS: { code: VnGoldListingCode; label: string }[] =
  VN_GOLD_ROW_ORDER.map((code) => ({
    code,
    label: VN_GOLD_DISPLAY_LABELS[code],
  }))
