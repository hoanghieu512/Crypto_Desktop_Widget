/**
 * Niêm yết bạc Phú Quý — fetch HTML, parse bảng giá.
 * Electron: qua main process (không CORS). Trình duyệt: corsproxy.io fallback.
 */

export const PHU_QUY_SILVER_URL = 'https://giabac.phuquygroup.vn/'
export const VN_SILVER_CACHE_KEY = 'vn-silver-cache'
const CACHE_TTL_MS = 60 * 60 * 1000

export interface VnSilverListing {
  brand: string
  code: string
  name: string
  buy: number
  sell: number | null
  unit: string
  updatedAt: string
}

type CachePayload = {
  v: 1
  savedAt: number
  listings: VnSilverListing[]
}

const ROW_DEFINITIONS: Array<{
  code: string
  name: string
  /** Khớp nội dung ô sản phẩm (đã chuẩn hóa khoảng trắng) */
  match: (productNorm: string) => boolean
}> = [
  {
    code: 'PQBAC999_1L',
    name: 'Bạc miếng Phú Quý 999 1 lượng',
    match: (p) =>
      /MIẾNG/i.test(p) &&
      /999/.test(p) &&
      /1\s+LƯỢNG/i.test(p) &&
      !/10\s+LƯỢNG/i.test(p),
  },
  {
    code: 'PQBAC999_10L',
    name: 'Bạc thỏi Phú Quý 999 10 lượng',
    match: (p) => /THỎI/i.test(p) && /10\s+LƯỢNG/i.test(p),
  },
]

function normalizeProductText(s: string): string {
  return s
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC')
    .toUpperCase()
}

function parseVndCell(s: string): number | null {
  const digits = s.replace(/[^\d]/g, '')
  if (!digits) return null
  const n = Number.parseInt(digits, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function extractPageUpdatedAt(doc: Document): string {
  const mobile = doc.querySelector('.update-info-mobile')
  const mobileText = mobile?.textContent?.trim() ?? ''
  const m = mobileText.match(/Cập nhật\s+lần\s+cuối\s*:\s*(.+)/i)
  if (m?.[1]) return m[1].trim()

  const timeEl = doc.querySelector('#update-datetime .time')
  const dateEl = doc.querySelector('#update-datetime .date')
  const t = timeEl?.textContent?.trim()
  const d = dateEl?.textContent?.trim()
  if (t && d) return `${t} ${d}`
  if (t || d) return `${t ?? ''} ${d ?? ''}`.trim()
  return ''
}

function parseListingsFromHtml(html: string): {
  listings: VnSilverListing[]
  pageUpdatedAt: string
} | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const pageUpdatedAt = extractPageUpdatedAt(doc)
    const byCode = new Map<string, VnSilverListing>()

    for (const tr of doc.querySelectorAll('table tbody tr')) {
      const tds = tr.querySelectorAll('td')
      if (tds.length < 4) continue

      const productRaw = tds[0]?.textContent ?? ''
      const productNorm = normalizeProductText(productRaw)
      if (!productNorm) continue

      const unitRaw = (tds[1]?.textContent ?? '').replace(/\s+/g, ' ').trim()
      const unit =
        unitRaw.toLowerCase().includes('lượng') || /Vnđ\//i.test(unitRaw)
          ? 'VNĐ/Lượng'
          : unitRaw || 'VNĐ/Lượng'

      const buy = parseVndCell(tds[2]?.textContent ?? '')
      const sell = parseVndCell(tds[3]?.textContent ?? '')
      if (buy == null || sell == null) continue

      for (const def of ROW_DEFINITIONS) {
        if (!def.match(productNorm) || byCode.has(def.code)) continue
        byCode.set(def.code, {
          brand: 'Phú Quý',
          code: def.code,
          name: def.name,
          buy,
          sell,
          unit,
          updatedAt: pageUpdatedAt || '—',
        })
        break
      }
    }

    const listings = ROW_DEFINITIONS.map((d) => byCode.get(d.code)).filter(
      (x): x is VnSilverListing => x != null,
    )
    if (listings.length === 0) return null
    return { listings, pageUpdatedAt: pageUpdatedAt || '—' }
  } catch {
    return null
  }
}

function loadCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(VN_SILVER_CACHE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as CachePayload
    if (p.v !== 1 || !Array.isArray(p.listings) || typeof p.savedAt !== 'number') {
      return null
    }
    return p
  } catch {
    return null
  }
}

function saveCache(listings: VnSilverListing[]): void {
  try {
    const payload: CachePayload = {
      v: 1,
      savedAt: Date.now(),
      listings,
    }
    localStorage.setItem(VN_SILVER_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

async function fetchHtmlViaElectron(url: string): Promise<string | null> {
  const ft = typeof window !== 'undefined' ? window.electronAPI?.fetchText : undefined
  if (!ft) return null
  try {
    const res = await ft(url)
    if (res?.ok === true && typeof res.text === 'string' && res.text.length > 0) {
      return res.text
    }
  } catch {
    /* ignore */
  }
  return null
}

async function fetchHtmlViaProxy(url: string): Promise<string | null> {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`
  try {
    const ctrl = new AbortController()
    const id = window.setTimeout(() => ctrl.abort(), 12_000)
    try {
      const r = await fetch(proxyUrl, {
        signal: ctrl.signal,
        headers: { Accept: 'text/html' },
      })
      if (!r.ok) return null
      return await r.text()
    } finally {
      window.clearTimeout(id)
    }
  } catch {
    return null
  }
}

async function fetchHtmlDirect(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const id = window.setTimeout(() => ctrl.abort(), 12_000)
    try {
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          Accept: 'text/html',
          'User-Agent': 'Mozilla/5.0 (compatible; CryptoWidget/1.1)',
        },
      })
      if (!r.ok) return null
      return await r.text()
    } finally {
      window.clearTimeout(id)
    }
  } catch {
    return null
  }
}

async function fetchHtmlWithFallback(url: string): Promise<string | null> {
  const electronHtml = await fetchHtmlViaElectron(url)
  if (electronHtml) return electronHtml

  const direct = await fetchHtmlDirect(url)
  if (direct && direct.includes('BẢNG GIÁ BẠC')) return direct

  return fetchHtmlViaProxy(url)
}

export type FetchVnSilverPricesResult = {
  listings: VnSilverListing[]
  pageUpdatedAt: string
  fromCache: boolean
}

/**
 * Lấy niêm yết Phú Quý. TTL 60 phút (bỏ qua nếu `bypassCache`).
 * Thất bại hoàn toàn → `null` (không throw).
 */
export async function fetchVnSilverPrices(options?: {
  bypassCache?: boolean
}): Promise<FetchVnSilverPricesResult | null> {
  if (!options?.bypassCache) {
    const cached = loadCache()
    if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS && cached.listings.length > 0) {
      const pageUpdatedAt = cached.listings[0]?.updatedAt ?? '—'
      return {
        listings: cached.listings,
        pageUpdatedAt,
        fromCache: true,
      }
    }
  }

  const html = await fetchHtmlWithFallback(PHU_QUY_SILVER_URL)
  if (!html) {
    const stale = loadCache()
    if (stale != null && stale.listings.length > 0) {
      const pageUpdatedAt = stale.listings[0]?.updatedAt ?? '—'
      return { listings: stale.listings, pageUpdatedAt, fromCache: true }
    }
    return null
  }

  const parsed = parseListingsFromHtml(html)
  if (!parsed || parsed.listings.length === 0) {
    const stale = loadCache()
    if (stale != null && stale.listings.length > 0) {
      const pageUpdatedAt = stale.listings[0]?.updatedAt ?? '—'
      return { listings: stale.listings, pageUpdatedAt, fromCache: true }
    }
    return null
  }

  const synced = parsed.listings.map((L) => ({
    ...L,
    updatedAt: parsed.pageUpdatedAt,
  }))
  saveCache(synced)

  return {
    listings: synced,
    pageUpdatedAt: parsed.pageUpdatedAt,
    fromCache: false,
  }
}
