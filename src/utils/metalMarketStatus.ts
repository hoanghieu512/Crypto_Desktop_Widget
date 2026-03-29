/**
 * OTC-style spot gold/silver week (aligned with typical FX broker metal sessions):
 * - Open: Sunday 22:00 UTC → Friday 22:00 UTC
 * - Closed: Friday 22:00 UTC → Sunday 22:00 UTC (weekend gap)
 *
 * Domestic VN listing hours are separate; this models world spot feed availability.
 */

export type MetalMarketStatusKind = 'OPEN' | 'CLOSED' | 'OPENING_SOON'

export type MetalMarketStatus = {
  isOpen: boolean
  status: MetalMarketStatusKind
  /** Next Sunday 22:00 UTC open when the market is currently closed (including OPENING_SOON). */
  nextOpenTime?: Date
}

/** Minutes before Sunday open to show OPENING_SOON. */
export const METAL_MARKET_OPENING_SOON_MINUTES = 60

const CLOSE_UTC_HOUR = 22
const OPEN_UTC_HOUR = 22

const OPENING_SOON_MS = METAL_MARKET_OPENING_SOON_MINUTES * 60 * 1000

/** Most recent Friday 22:00:00.000 UTC instant that is strictly ≤ `now`. */
function lastFridayCloseUtc(now: Date): Date {
  const wd = now.getUTCDay()
  const daysSinceFri = (wd + 2) % 7
  const ref = new Date(now)
  ref.setUTCDate(ref.getUTCDate() - daysSinceFri)
  ref.setUTCHours(CLOSE_UTC_HOUR, 0, 0, 0)
  if (now.getTime() < ref.getTime()) {
    ref.setUTCDate(ref.getUTCDate() - 7)
  }
  return ref
}

/** Sunday 22:00:00.000 UTC immediately following the given Friday 22:00 close. */
function nextSundayOpenUtcAfterFridayClose(fridayClose: Date): Date {
  const d = new Date(fridayClose)
  d.setUTCDate(d.getUTCDate() + 2)
  d.setUTCHours(OPEN_UTC_HOUR, 0, 0, 0)
  return d
}

function isInWeekendClosedWindow(now: Date, lastFriClose: Date, nextSunOpen: Date): boolean {
  const t = now.getTime()
  return t >= lastFriClose.getTime() && t < nextSunOpen.getTime()
}

export function getMetalMarketStatus(now: Date = new Date()): MetalMarketStatus {
  const lastFriClose = lastFridayCloseUtc(now)
  const nextSunOpen = nextSundayOpenUtcAfterFridayClose(lastFriClose)

  if (!isInWeekendClosedWindow(now, lastFriClose, nextSunOpen)) {
    return { isOpen: true, status: 'OPEN' }
  }

  const msToOpen = nextSunOpen.getTime() - now.getTime()
  if (msToOpen > 0 && msToOpen <= OPENING_SOON_MS) {
    return {
      isOpen: false,
      status: 'OPENING_SOON',
      nextOpenTime: new Date(nextSunOpen.getTime()),
    }
  }

  return {
    isOpen: false,
    status: 'CLOSED',
    nextOpenTime: new Date(nextSunOpen.getTime()),
  }
}
