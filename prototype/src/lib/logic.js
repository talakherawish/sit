import { abs, split, weekday, addDays, ceil30 } from './time'

export const ACTIVE = ['awaiting_confirmation', 'confirmed', 'checked_in', 'used']
export const REASONS = ['study', 'group_project', 'client_call', 'meeting', 'interview', 'other']
export const REMINDERS = ['2h', '3h', '1d', 'eve']
export const ISSUE_TYPES = ['ac', 'wifi', 'noise', 'cleanliness', 'furniture', 'other']
export const NOTICE_TAGS = ['ac', 'wifi', 'events', 'other']

/** Calendar date ('YYYY-MM-DD') of an absolute timestamp. */
export const dateOf = (a) => split(a).date
/** Minutes since midnight of an absolute timestamp. */
export const minOfDay = (a) => split(a).min

export function hoursFor(data, date) {
  if (data.closed_days.some((c) => c.date === date)) return null
  const h = data.opening_hours.find((o) => o.weekday === weekday(date))
  return h && h.open !== null ? { open: h.open, close: h.close } : null
}
export const closedReason = (data, date) => data.closed_days.find((c) => c.date === date)?.reason

export const bookable = (data) => data.spaces
export const space = (data, id) => data.spaces.find((s) => s.id === id)
export const renter = (data, id) => data.renters.find((r) => r.id === id)

const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2

export function downAt(sp, date, start, end) {
  const d = sp?.down
  return !!d && d.date === date && overlaps(start, end, d.from, d.to)
}

export function bookingAt(data, spaceId, date, start, end, excludeId) {
  return data.bookings.find(
    (b) => b.space_id === spaceId && b.date === date && b.id !== excludeId && ACTIVE.includes(b.status) && overlaps(start, end, b.start, b.end),
  )
}

export function isFree(data, spaceId, date, start, end, excludeId) {
  const h = hoursFor(data, date)
  if (!h || start < h.open || end > h.close) return false
  if (downAt(space(data, spaceId), date, start, end)) return false
  return !bookingAt(data, spaceId, date, start, end, excludeId)
}

/** 30-minute start times on `date` where a booking of `dur` minutes fits. */
export function freeStarts(data, spaceId, date, now, dur = 30, excludeId) {
  const h = hoursFor(data, date)
  if (!h) return []
  let from = h.open
  if (date === dateOf(now)) from = Math.max(from, ceil30(minOfDay(now)))
  const out = []
  for (let m = from; m + dur <= h.close; m += 30) if (isFree(data, spaceId, date, m, m + dur, excludeId)) out.push(m)
  return out
}

export function stateAt(data, spaceId, date, min) {
  const sp = space(data, spaceId)
  if (downAt(sp, date, min, min + 1)) return { state: 'down', reason: sp.down.reason }
  const b = bookingAt(data, spaceId, date, min, min + 1)
  if (b) return { state: 'booked', booking: b }
  return { state: 'free' }
}

/** First free minute at or after `min`, on the same day. */
export function nextFreeAt(data, spaceId, date, min) {
  const h = hoursFor(data, date)
  if (!h) return null
  for (let m = Math.max(min, h.open); m < h.close; m += 30) {
    const s = Math.floor(m / 30) * 30
    if (isFree(data, spaceId, date, s, s + 30)) return s
  }
  return null
}

/** Free / Booked / Down blocks for a room from `from` until closing. */
export function dayBlocks(data, spaceId, date, from) {
  const h = hoursFor(data, date)
  if (!h) return []
  const blocks = []
  for (let m = Math.max(h.open, Math.floor(from / 30) * 30); m < h.close; m += 30) {
    const st = stateAt(data, spaceId, date, m).state
    const last = blocks[blocks.length - 1]
    if (last && last.state === st) last.to = m + 30
    else blocks.push({ state: st, from: m, to: m + 30 })
  }
  return blocks
}

export function reminderAt(date, start, reminder) {
  const s = abs(date, start)
  return { '2h': s - 120, '3h': s - 180, '1d': s - 1440, eve: abs(addDays(date, -1), 20 * 60) }[reminder] ?? null
}

export const activeNotices = (data, now) =>
  data.notices.filter((n) => !n.removed && n.posted_at <= now && n.expires_at > now).sort((a, b) => b.posted_at - a.posted_at)

export const isPaused = (r, now) => !!r?.paused_until && r.paused_until > dateOf(now)

export const startAbs = (b) => abs(b.date, b.start)
export const endAbs = (b) => abs(b.date, b.end)

export const normPhone = (p) => (p || '').replace(/\D/g, '').replace(/^0+/, '')

/** Booking status as reception sees it on S-01. */
export function staffStatus(b) {
  if (b.status === 'used' || b.status === 'checked_in') return 'checked_in'
  if (b.status === 'released') return b.release_reason === 'no_checkin' ? 'no_show' : 'released'
  if (b.status === 'cancelled' || b.status === 'cancelled_by_staff') return b.status
  return 'upcoming'
}

/** Opening hours of an amenity on a date; 'building' amenities follow the building. */
export function amenityHoursFor(data, a, date) {
  const building = hoursFor(data, date)
  if (!building || a.hours === 'building') return building
  const h = a.hours.find((o) => o.weekday === weekday(date))
  return h && h.open !== null ? { open: h.open, close: h.close } : null
}

/** Open now? If not, the next opening (date + minute) within two weeks. */
export function amenityStatus(data, a, now) {
  const date = dateOf(now)
  const min = minOfDay(now)
  const h = amenityHoursFor(data, a, date)
  if (h && min >= h.open && min < h.close) return { open: true, until: h.close }
  for (let i = 0; i < 14; i++) {
    const d = addDays(date, i)
    const hh = amenityHoursFor(data, a, d)
    if (hh && (i > 0 || min < hh.open)) return { open: false, next: { date: d, min: hh.open } }
  }
  return { open: false }
}
