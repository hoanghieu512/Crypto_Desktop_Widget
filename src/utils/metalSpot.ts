/** 1 lượng (cây) VN */
export const GRAMS_PER_LUONG = 37.5

/** 1 troy ounce (vàng / bạc spot) */
export const GRAMS_PER_TROY_OZ = 31.1035

/** 1 lượng tương đương bao nhiêu troy ounce */
export const TROY_OZ_PER_LUONG = GRAMS_PER_LUONG / GRAMS_PER_TROY_OZ

/**
 * Spot (USD / troy oz) × USD→VND × (37.5 / 31.1035) → VND / lượng
 * Dùng chung cho XAU, XAG và kim loại niêm yết theo oz.
 */
export function convertUsdPerTroyOzToVndPerLuong(
  usdPerTroyOz: number,
  usdToVnd: number,
): number | null {
  if (
    !Number.isFinite(usdPerTroyOz) ||
    !Number.isFinite(usdToVnd) ||
    usdPerTroyOz <= 0 ||
    usdToVnd <= 0
  ) {
    return null
  }
  return usdPerTroyOz * usdToVnd * TROY_OZ_PER_LUONG
}

export type MetalSpreadNumbers = {
  spreadVnd: number
  spreadPercent: number
}

/**
 * spread = VN/lượng − thế giới quy đổi (VND/lượng)
 * % = spread / world × 100
 */
export function calculateMetalSpread(
  vnVndPerLuong: number,
  worldVndPerLuong: number,
): MetalSpreadNumbers | null {
  if (
    !Number.isFinite(vnVndPerLuong) ||
    !Number.isFinite(worldVndPerLuong) ||
    worldVndPerLuong <= 0
  ) {
    return null
  }
  const spreadVnd = vnVndPerLuong - worldVndPerLuong
  const spreadPercent = (spreadVnd / worldVndPerLuong) * 100
  return { spreadVnd, spreadPercent }
}

/** VN đắt hơn spot → đỏ; VN rẻ hơn → xanh */
export function metalSpreadAccentClass(spreadVnd: number, neutralBandVnd = 50_000): string {
  if (spreadVnd > neutralBandVnd) return 'text-rose-400'
  if (spreadVnd < -neutralBandVnd) return 'text-emerald-400'
  return 'text-slate-400'
}
