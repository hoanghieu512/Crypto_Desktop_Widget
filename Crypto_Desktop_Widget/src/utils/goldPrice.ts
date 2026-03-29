import {
  calculateMetalSpread,
  convertUsdPerTroyOzToVndPerLuong,
  type MetalSpreadNumbers,
} from './metalSpot'

export {
  GRAMS_PER_LUONG,
  GRAMS_PER_TROY_OZ,
  TROY_OZ_PER_LUONG,
  convertUsdPerTroyOzToVndPerLuong,
} from './metalSpot'

/** @deprecated Dùng convertUsdPerTroyOzToVndPerLuong — cùng công thức */
export function convertXauUsdOzToVndPerLuong(
  usdPerTroyOz: number,
  usdToVnd: number,
): number | null {
  return convertUsdPerTroyOzToVndPerLuong(usdPerTroyOz, usdToVnd)
}

export type GoldSpreadNumbers = MetalSpreadNumbers

export function calculateGoldSpread(
  vnVndPerLuong: number,
  worldVndPerLuong: number,
): GoldSpreadNumbers | null {
  return calculateMetalSpread(vnVndPerLuong, worldVndPerLuong)
}

export type SpreadInsight = 'premium' | 'discount' | 'neutral'

/** VN đắt hơn spot quy đổi → premium; rẻ hơn → discount */
export function getSpreadInsight(
  spreadVnd: number,
  neutralBandVnd = 50_000,
): SpreadInsight {
  if (spreadVnd > neutralBandVnd) return 'premium'
  if (spreadVnd < -neutralBandVnd) return 'discount'
  return 'neutral'
}

export function spreadInsightLabelVi(insight: SpreadInsight): string {
  switch (insight) {
    case 'premium':
      return 'Giá bán VN cao hơn giá bán thế giới quy đổi'
    case 'discount':
      return 'Giá bán VN thấp hơn giá bán thế giới quy đổi'
    default:
      return 'Giá bán VN sát mức thế giới quy đổi'
  }
}

/** Nhãn ngắn cho badge (phụ phí / chiết khấu / sát giá) */
export function spreadInsightShortLabelVi(insight: SpreadInsight): string {
  switch (insight) {
    case 'premium':
      return 'Phụ phí'
    case 'discount':
      return 'Chiết khấu'
    default:
      return 'Sát giá TG'
  }
}

export function spreadAccentClass(insight: SpreadInsight): string {
  switch (insight) {
    case 'premium':
      return 'text-rose-400'
    case 'discount':
      return 'text-emerald-400'
    default:
      return 'text-slate-400'
  }
}
