import { abs, split, weekday, addDays, addMonths, ceil30 } from './time'

export const ACTIVE = ['awaiting_confirmation', 'confirmed', 'checked_in', 'used']
/** One list for "What are you here to do?" and a booking's (optional) reason. */
export const REASONS = ['study', 'client_call', 'group_project', 'meeting', 'interview', 'other']
/** Repeat patterns; none picked = no repeat. Each runs until its "Until" date. */
export const REPEATS = ['weekly', 'monthly']
/** "Until" filled in when a repeat is picked: a month for weekly, six months for monthly. */
export const defaultUntil = (first, repeat) => addMonths(first, repeat === 'monthly' ? 6 : 1)

/**
 * Picked days plus their repeats up to `until`: the same weekday every week, or the same date every
 * month (months without that date are skipped). Returns the open days to book and the days skipped
 * because the building is closed.
 */
export function expandDates(data, picked, repeat, until) {
  const sorted = [...new Set(picked)].sort()
  if (!sorted.length) return { dates: [], closed: [] }
  const all = new Set(sorted)
  if (repeat && until)
    for (const d of sorted) {
      if (repeat === 'weekly') for (let x = addDays(d, 7); x <= until; x = addDays(x, 7)) all.add(x)
      else
        for (let n = 1; ; n++) {
          const x = addMonths(d, n)
          if (x > until) break
          if (x.slice(8) === d.slice(8)) all.add(x)
        }
    }
  const list = [...all].sort()
  return { dates: list.filter((d) => hoursFor(data, d)), closed: list.filter((d) => !hoursFor(data, d)) }
}

/**
 * A schedule that books every one of `dates` from `start` to `end`, never skipping a date. Each date goes
 * in `main` (the picked room) when it's free; else in another room free the whole time (the one used
 * most so far, so the schedule stays in few rooms); else the time is split across rooms, each part in
 * the room that stays free longest. Times you're already booked elsewhere are left out (you have them).
 * Only a half hour when every room is taken (or that has already passed) can't be booked: a gap.
 *
 * Returns `rooms` (the dates each room is free the whole time, for the map), `best` (the room free on
 * the most dates), `items` (what gets booked) and `days`: per date its `parts`, `gaps` and whether
 * you're already booked for some of that time (`yours`).
 */
export function planSchedule(data, dates, start, end, renterId, now, main) {
  const today = dateOf(now)
  const nowMin = minOfDay(now)
  const mine = (d, a, b) => data.bookings.some((x) => x.renter_id === renterId && x.date === d && ACTIVE.includes(x.status) && x.start < b && a < x.end)
  const past = (d, a) => d === today && a < nowMin
  const ok = (id, d, a, b) => isFree(data, id, d, a, b) && !mine(d, a, b) && !past(d, a)
  const ids = data.spaces.map((sp) => sp.id)
  const rooms = ids.map((id) => ({ id, free: dates.filter((d) => ok(id, d, start, end)) }))
  const best = [...rooms].sort((x, y) => y.free.length - x.free.length)[0]?.id || null
  const lead = main || best
  const used = {}
  const use = (id) => (used[id] = (used[id] || 0) + 1)
  const days = dates.map((date) => {
    const day = { date, parts: [], gaps: [], yours: mine(date, start, end) }
    // The whole time in one room: the picked one, else the one used most so far.
    const whole = [lead, ...[...ids].sort((x, y) => (used[y] || 0) - (used[x] || 0))].find((id) => id && ok(id, date, start, end))
    if (whole) {
      day.parts.push({ spaceId: whole, start, end })
      use(whole)
      return day
    }
    // Otherwise half hour by half hour: each part goes in the room that stays free longest from there.
    for (let m = start; m < end;) {
      if (mine(date, m, m + 30)) {
        m += 30
        continue
      }
      let pick = null
      let reach = m
      for (const id of [day.parts.at(-1)?.spaceId, lead, ...ids]) {
        if (!id) continue
        let e = m
        while (e < end && ok(id, date, e, e + 30)) e += 30
        if (e > reach) [pick, reach] = [id, e]
      }
      if (pick) {
        day.parts.push({ spaceId: pick, start: m, end: reach })
        use(pick)
        m = reach
      } else {
        const g = day.gaps.at(-1)
        if (g && g.end === m) g.end = m + 30
        else day.gaps.push({ start: m, end: m + 30, past: past(date, m) })
        m += 30
      }
    }
    return day
  })
  const items = days.flatMap((d) => d.parts.map((p) => ({ date: d.date, ...p })))
  return { rooms, best, days, items }
}

export const REMINDERS = ['2h', '3h', '1d', 'eve']
export const ISSUE_TYPES = ['ac', 'wifi', 'noise', 'cleanliness', 'furniture', 'other']
export const NOTICE_TAGS = ['ac', 'wifi', 'events', 'other']
export const NOTIF_ICON = { booking: 'calendar', notice: 'megaphone', report: 'flag', cancel: 'close', reminder: 'bell', release: 'clock' }

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

/** The one notice renters see on Today: an event comes first (it changes how the day goes), else the latest. */
export const todayNotice = (notices) => notices.find((n) => n.tag === 'events') || notices[0]

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

/** Speed tests run so far today, newest first (Wi-Fi amenity). */
export function speedTests(data, now) {
  const wifi = data.amenities.find((a) => a.id === 'wifi')
  return (wifi?.speed_tests || []).filter((x) => x.time <= now && dateOf(x.time) === dateOf(now)).reverse()
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
