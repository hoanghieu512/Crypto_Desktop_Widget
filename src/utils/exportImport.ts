/** Local backup export/import. Never includes Binance API credentials. */

export const EXPORT_VERSION = '1.0'

export const IMPORT_FLASH_KEY = 'crypto-dashboard-import-flash-v1'

export const LS_KEYS = {
  watchlist: 'crypto-watchlist-v2',
  portfolio: 'futures-portfolio-v1',
  alerts: 'price-alerts-v1',
  alertsSettings: 'price-alerts-settings-v1',
  simulator: 'futures-simulator-state-v1',
} as const

const APP_VERSION = '0.0.0'

export type BackupDataV1 = {
  watchlist?: unknown
  portfolio?: unknown
  alerts?: unknown
  /** Restores alert sound toggle etc. */
  alertsSettings?: unknown
  /** Persisted futures simulator UI state (key in LS: futures-simulator-state-v1) */
  simulatorStates?: unknown
}

export type BackupFileV1 = {
  exportVersion: string
  exportedAt: string
  appVersion: string
  data: BackupDataV1
}

export type ImportPreview = {
  fileName: string
  watchlistCount: number
  portfolioCount: number
  alertsCount: number
  hasSimulator: boolean
  hasAlertSettings: boolean
  data: BackupDataV1
}

function formatBackupDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function tryStorageJson(key: string): unknown | null {
  const raw = localStorage.getItem(key)
  if (raw == null || raw === '') return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export function countWatchlistItems(w: unknown): number {
  if (w == null) return 0
  if (Array.isArray(w)) return w.length
  if (typeof w === 'object' && Array.isArray((w as { items?: unknown }).items)) {
    return (w as { items: unknown[] }).items.length
  }
  return 0
}

export function countPortfolioPositions(p: unknown): number {
  if (p == null || typeof p !== 'object') return 0
  const positions = (p as { positions?: unknown }).positions
  return Array.isArray(positions) ? positions.length : 0
}

export function countAlerts(a: unknown): number {
  return Array.isArray(a) ? a.length : 0
}

export function exportAllData(): void {
  const data: BackupDataV1 = {
    watchlist:
      tryStorageJson(LS_KEYS.watchlist) ??
      ({ v: 2, marketMode: 'global', globalMarket: 'spot', items: [] } as const),
    portfolio: tryStorageJson(LS_KEYS.portfolio) ?? { positions: [] },
    alerts: tryStorageJson(LS_KEYS.alerts) ?? [],
    alertsSettings:
      tryStorageJson(LS_KEYS.alertsSettings) ?? ({ v: 1, soundEnabled: false } as const),
    simulatorStates: tryStorageJson(LS_KEYS.simulator) ?? {},
  }

  const payload: BackupFileV1 = {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `crypto-dashboard-backup-${formatBackupDate(new Date())}.json`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupValidationError'
  }
}

export function parseBackupJson(text: string): BackupFileV1 {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new BackupValidationError('INVALID_JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BackupValidationError('INVALID_FORMAT')
  }
  const o = parsed as Record<string, unknown>
  if (typeof o.exportVersion !== 'string' || !o.exportVersion.trim()) {
    throw new BackupValidationError('INVALID_FORMAT')
  }
  if (!o.data || typeof o.data !== 'object' || Array.isArray(o.data)) {
    throw new BackupValidationError('INVALID_FORMAT')
  }
  const d = o.data as Record<string, unknown>

  if (d.watchlist != null && typeof d.watchlist !== 'object') {
    throw new BackupValidationError('INVALID_FORMAT')
  }
  if (d.portfolio != null && (typeof d.portfolio !== 'object' || Array.isArray(d.portfolio))) {
    throw new BackupValidationError('INVALID_FORMAT')
  }
  if (d.alerts != null && !Array.isArray(d.alerts)) {
    throw new BackupValidationError('INVALID_FORMAT')
  }
  if (
    d.alertsSettings != null &&
    (typeof d.alertsSettings !== 'object' || Array.isArray(d.alertsSettings))
  ) {
    throw new BackupValidationError('INVALID_FORMAT')
  }
  if (
    d.simulatorStates != null &&
    (typeof d.simulatorStates !== 'object' || Array.isArray(d.simulatorStates))
  ) {
    throw new BackupValidationError('INVALID_FORMAT')
  }

  return {
    exportVersion: o.exportVersion,
    exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : new Date(0).toISOString(),
    appVersion: typeof o.appVersion === 'string' ? o.appVersion : '',
    data: {
      watchlist: d.watchlist,
      portfolio: d.portfolio,
      alerts: d.alerts,
      alertsSettings: d.alertsSettings,
      simulatorStates: d.simulatorStates,
    },
  }
}

export function buildImportPreview(fileName: string, backup: BackupFileV1): ImportPreview {
  const { data } = backup
  return {
    fileName,
    watchlistCount: countWatchlistItems(data.watchlist),
    portfolioCount: countPortfolioPositions(data.portfolio),
    alertsCount: countAlerts(data.alerts),
    hasSimulator: data.simulatorStates != null && Object.keys(data.simulatorStates as object).length > 0,
    hasAlertSettings: data.alertsSettings != null,
    data,
  }
}

/** Replace-all import: writes known keys, flashes success, reloads. */
export function applyImportReplaceAll(data: BackupDataV1): void {
  if (data.watchlist !== undefined) {
    localStorage.setItem(LS_KEYS.watchlist, JSON.stringify(data.watchlist))
  }
  if (data.portfolio !== undefined) {
    localStorage.setItem(LS_KEYS.portfolio, JSON.stringify(data.portfolio))
  }
  if (data.alerts !== undefined) {
    localStorage.setItem(LS_KEYS.alerts, JSON.stringify(data.alerts))
  }
  if (data.alertsSettings !== undefined) {
    localStorage.setItem(LS_KEYS.alertsSettings, JSON.stringify(data.alertsSettings))
  }
  if (data.simulatorStates !== undefined) {
    localStorage.setItem(LS_KEYS.simulator, JSON.stringify(data.simulatorStates))
  }

  try {
    window.dispatchEvent(new CustomEvent('portfolio:change'))
    window.dispatchEvent(new CustomEvent('price-alerts:change'))
  } catch {
    /* ignore */
  }

  const w = countWatchlistItems(data.watchlist)
  const p = countPortfolioPositions(data.portfolio)
  const a = countAlerts(data.alerts)

  try {
    sessionStorage.setItem(
      IMPORT_FLASH_KEY,
      JSON.stringify({
        kind: 'success',
        title: 'Backup restored',
        message: `Data restored successfully: ${w} watchlist items, ${p} manual positions, ${a} alerts`,
      }),
    )
  } catch {
    /* ignore */
  }

  window.location.reload()
}

export function userMessageForBackupError(err: unknown): string {
  if (err instanceof BackupValidationError) {
    if (err.message === 'INVALID_JSON') {
      return 'Invalid backup file. The file is not valid JSON.'
    }
    return 'Invalid backup file. Please select a valid backup.'
  }
  return 'Invalid backup file. Please select a valid backup.'
}
