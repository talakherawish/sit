import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import seed from '../data/mock-data.json'
import { abs, parseHm, addDays, weekday, split, hm } from '../lib/time'
import {
  hoursFor, reminderAt, isFree, today, renter as findRenter, normPhone, ACTIVE, startAbs, endAbs,
} from '../lib/logic'

const dt = (s) => (s ? abs(s.slice(0, 10), parseHm(s.slice(11, 16))) : null)

function buildData() {
  const d = structuredClone(seed)
  d.opening_hours = d.opening_hours.map((o) => ({ ...o, open: o.open && parseHm(o.open), close: o.close && parseHm(o.close) }))
  const fixBooking = (b) => {
    b.start = parseHm(b.start)
    b.end = parseHm(b.end)
    b.reminder_at = b.reminder ? reminderAt(b.date, b.start, b.reminder) : null
    b.reminder_sent = b.status !== 'awaiting_confirmation'
    b.created_at = abs(addDays(b.date, -2), 18 * 60)
    return b
  }
  d.bookings.forEach(fixBooking)
  for (const s of d.series) {
    for (let date = s.from; date <= s.until; date = addDays(date, 1)) {
      if (!s.days.includes(weekday(date)) || !hoursFor(d, date)) continue
      d.bookings.push(fixBooking({
        id: `${s.id}-${date}`, renter_id: s.renter_id, space_id: s.space_id, date, start: s.start, end: s.end,
        reason: s.reason, reminder: s.reminder, series_id: s.id, status: 'awaiting_confirmation', created_by: 'renter', source: 'map',
      }))
    }
  }
  d.visits.forEach((v) => { v.check_in = dt(v.check_in); v.check_out = dt(v.check_out) })
  d.seat_log.forEach((l) => { l.time = dt(l.time) })
  d.notices.forEach((n) => { n.posted_at = dt(n.posted_at); n.expires_at = dt(n.expires_at) })
  d.reports.forEach((r) => { r.history.forEach((h) => { h.time = dt(h.time) }) })
  d.spaces.forEach((s) => { s.down = null })
  d.ratings = []
  d.messages = []
  d.notifications = [
    { id: 'nt-1', renter_id: 'larine', kind: 'report', tpl: 'report_status', params: { status: 'in_progress', spaceId: 'big-2' }, time: dt('2026-10-01T08:15'), read: false, link: '/r/reports' },
  ]
  d.settings = { no_show: { count: 3, days: 30, pause: 7 } }
  // 37 anonymous visitors already opened Sit this morning (North Star counter).
  const start = dt(seed.start_now)
  d.events = Array.from({ length: 37 }, (_, i) => ({ name: 'page_view', visitor_id: `guest-${i + 1}`, time: start - 90 + i * 2 }))
  return d
}

let seq = 1
const uid = (p) => `${p}-${Date.now().toString(36)}-${seq++}`

const initial = () => ({
  data: buildData(),
  now: dt(seed.start_now),
  renterId: null,
  lang: 'en',
  receptionDevice: true,
  justTaken: false,
  guestId: 'guest-you',
  mode: 'browse',
  when: null, // null = now, else { date, min }
  selected: null, // selected map object id
  draft: null, // booking being prepared for R-06
  gate: null, // { returnTo } when the login sheet is open
  returnTo: null,
  pendingAuth: null,
  pendingRating: {}, // renterId -> visitId
  reportSpace: null,
  toast: null,
  drawerOpen: false,
  drawerTab: 'p1',
})

export const useStore = create(
  immer((set, get) => ({
    ...initial(),

    reset: () => set(() => ({ ...initial(), drawerOpen: get().drawerOpen, drawerTab: get().drawerTab })),
    setLang: (lang) => set({ lang }),
    set: (patch) => set(patch),
    showToast: (key, params = {}) => set({ toast: { key, params, id: Date.now() } }),

    loginAs: (renterId) => set((s) => {
      s.renterId = renterId
      if (renterId) s.lang = findRenter(s.data, renterId).language
    }),

    // ---- messages, notifications, analytics ---------------------------------
    logEvent: (name, extra = {}) => set((s) => { logEvent(s, name, extra) }),

    // ---- time simulator -----------------------------------------------------
    setNow: (a) => set((s) => {
      if (a < s.now) return
      s.now = a
      processTime(s)
    }),

    // ---- auth ----------------------------------------------------------------
    sendCode: (pending) => set((s) => {
      const code = String(1000 + Math.floor(Math.random() * 9000))
      s.pendingAuth = { ...pending, code }
      sendMessage(s, 'sms', pending.phone, 'code', { code })
    }),
    completeAuth: () => {
      const s = get()
      const p = s.pendingAuth
      if (!p) return null
      let id = p.renterId
      set((st) => {
        if (p.mode === 'signup') {
          id = uid('renter')
          st.data.renters.push({ id, name: p.name, phone: p.phone, email: p.email, language: st.lang, birthday: null, preferred_contact: 'sms', no_show_count: 0, paused_until: null })
          logEvent(st, 'sign_up', { visitor_id: id })
        } else {
          st.lang = findRenter(st.data, id).language
        }
        st.renterId = id
        st.pendingAuth = null
        logEvent(st, 'login', { visitor_id: id })
      })
      return id
    },
    createRenter: (r) => {
      const id = uid('renter')
      set((s) => { s.data.renters.push({ id, language: s.lang, birthday: null, preferred_contact: 'sms', no_show_count: 0, paused_until: null, email: '', ...r }) })
      return id
    },
    updateRenter: (id, patch) => set((s) => { Object.assign(findRenter(s.data, id), patch) }),
    findByPhoneOrEmail: (phone, email) => get().data.renters.find(
      (r) => (phone && normPhone(r.phone) === normPhone(phone)) || (email && r.email && r.email.toLowerCase() === email.toLowerCase()),
    ),

    // ---- bookings ------------------------------------------------------------
    /** Creates one booking or a series. Returns { ids, skipped }. */
    createBooking: (f, { createdBy = 'renter', source = 'map' } = {}) => {
      const ids = []
      let skipped = 0
      set((s) => {
        const dates = [f.date]
        let seriesId = null
        if (f.repeat?.on) {
          seriesId = uid('series')
          for (let d = addDays(f.date, 1); d <= f.repeat.until; d = addDays(d, 1)) {
            const wd = weekday(d)
            if (f.repeat.kind === 'weekly' ? wd === weekday(f.date) : f.repeat.days.includes(wd)) dates.push(d)
          }
        }
        for (const date of dates) {
          if (!isFree(s.data, f.spaceId, date, f.start, f.end)) { skipped++; continue }
          const rAt = f.reminder ? reminderAt(date, f.start, f.reminder) : null
          const remind = rAt !== null && rAt > s.now
          const b = {
            id: uid('b'), renter_id: f.renterId, space_id: f.spaceId, date, start: f.start, end: f.end,
            reason: f.reason, reason_other: f.reason === 'other' ? f.reasonOther : undefined,
            reminder: remind ? f.reminder : null, reminder_at: remind ? rAt : null, reminder_sent: !remind,
            series_id: seriesId, status: remind ? 'awaiting_confirmation' : 'confirmed',
            created_by: createdBy, source, created_at: s.now,
          }
          s.data.bookings.push(b)
          ids.push(b.id)
        }
        if (ids.length) {
          const r = findRenter(s.data, f.renterId)
          const first = s.data.bookings.find((b) => b.id === ids[0])
          sendMessage(s, 'email', r.email || r.phone, 'receipt', { spaceId: f.spaceId, date: first.date, time: hm(first.start), count: ids.length }, ids[0])
          if (createdBy === 'staff') {
            sendMessage(s, 'sms', r.phone, 'staff_booked', { spaceId: f.spaceId, date: first.date, time: hm(first.start) }, ids[0])
            notify(s, r.id, 'booking', 'staff_booked', { spaceId: f.spaceId, date: first.date, time: hm(first.start) }, '/r/bookings')
          }
          logEvent(s, 'booking_created', { visitor_id: r.id, source, count: ids.length })
        }
      })
      return { ids, skipped }
    },

    /** "Slot just taken" demo: someone else grabs the slot a moment before the renter. */
    stealSlot: (f) => set((s) => {
      s.data.bookings.push({
        id: uid('b'), renter_id: 'sara', space_id: f.spaceId, date: f.date, start: f.start, end: f.end, reason: 'study',
        reminder: null, reminder_at: null, reminder_sent: true, status: 'confirmed', created_by: 'renter', source: 'map', created_at: s.now,
      })
      s.justTaken = false
    }),

    cancelBooking: (id, whole = false, by = 'renter') => set((s) => {
      const b = s.data.bookings.find((x) => x.id === id)
      const targets = whole && b.series_id
        ? s.data.bookings.filter((x) => x.series_id === b.series_id && ACTIVE.includes(x.status) && startAbs(x) > s.now)
        : [b]
      targets.forEach((x) => { x.status = 'cancelled' })
      const r = findRenter(s.data, b.renter_id)
      sendMessage(s, 'email', r.email || r.phone, 'cancelled', { spaceId: b.space_id, date: b.date, time: hm(b.start), count: targets.length }, b.id)
      logEvent(s, 'booking_cancelled', { visitor_id: r.id, by })
    }),

    moveBooking: (id, date, start, end) => set((s) => {
      const b = s.data.bookings.find((x) => x.id === id)
      Object.assign(b, { date, start, end })
      if (b.reminder) {
        const rAt = reminderAt(date, start, b.reminder)
        if (rAt > s.now) Object.assign(b, { reminder_at: rAt, reminder_sent: false, status: 'awaiting_confirmation' })
        else Object.assign(b, { reminder: null, reminder_at: null, reminder_sent: true, status: 'confirmed' })
      }
      const r = findRenter(s.data, b.renter_id)
      sendMessage(s, 'email', r.email || r.phone, 'moved', { spaceId: b.space_id, date, time: hm(start) }, b.id)
      logEvent(s, 'booking_changed', { visitor_id: r.id })
    }),

    confirmBooking: (id) => set((s) => {
      const b = s.data.bookings.find((x) => x.id === id)
      if (b.status === 'awaiting_confirmation') b.status = 'confirmed'
      logEvent(s, 'reminder_confirmed', { visitor_id: b.renter_id })
    }),

    // ---- door + seats --------------------------------------------------------
    adjustSeats: (delta) => set((s) => { changeSeats(s, delta, 'manual') }),

    checkIn: (renterId) => set((s) => {
      const b = s.data.bookings.find(
        (x) => x.renter_id === renterId && x.date === today(s.now) && ['awaiting_confirmation', 'confirmed'].includes(x.status) && endAbs(x) > s.now,
      )
      if (b) b.status = 'used'
      s.data.visits.push({ id: uid('v'), renter_id: renterId, check_in: s.now, check_out: null, via: b ? 'sit' : 'walk_in', booking_id: b?.id })
      changeSeats(s, +1, 'check_in')
      logEvent(s, 'check_in', { visitor_id: renterId, via: b ? 'sit' : 'walk_in' })
    }),
    checkOut: (renterId) => set((s) => {
      const v = s.data.visits.find((x) => x.renter_id === renterId && !x.check_out)
      if (!v) return
      v.check_out = s.now
      changeSeats(s, -1, 'check_out')
      if (v.via === 'sit') s.pendingRating[renterId] = v.id
      logEvent(s, 'check_out', { visitor_id: renterId })
    }),

    // ---- notices ---------------------------------------------------------------
    postNotice: (n) => set((s) => {
      const notice = { id: uid('n'), removed: false, posted_at: s.now, ...n }
      s.data.notices.push(notice)
      logEvent(s, 'notice_posted', { tag: n.tag })
      // #24 notice alerts: renters with a booking today (in that room, if one is named)
      const affected = new Set(
        s.data.bookings
          .filter((b) => b.date === today(s.now) && ACTIVE.includes(b.status) && endAbs(b) > s.now && (!n.space_id || b.space_id === n.space_id))
          .map((b) => b.renter_id),
      )
      for (const rid of affected) {
        const b = s.data.bookings.find((x) => x.renter_id === rid && x.date === today(s.now) && ACTIVE.includes(x.status) && (!n.space_id || x.space_id === n.space_id))
        const r = findRenter(s.data, rid)
        const params = { text: n.text, spaceId: b.space_id, time: hm(b.start) }
        notify(s, rid, 'notice', 'notice_alert', params, '/r/home')
        sendMessage(s, 'sms', r.phone, 'notice_alert', params)
      }
    }),
    editNotice: (id, text) => set((s) => {
      const n = s.data.notices.find((x) => x.id === id)
      n.text = { en: text, ar: text }
      n.edited_at = s.now
    }),
    removeNotice: (id) => set((s) => { s.data.notices.find((x) => x.id === id).removed = true }),

    // ---- reports ----------------------------------------------------------------
    sendReport: (r) => set((s) => {
      s.data.reports.unshift({ id: uid('r'), status: 'sent', history: [{ status: 'sent', time: s.now }], reply: null, ...r })
      logEvent(s, 'report_sent', { visitor_id: r.renter_id, type: r.type })
    }),
    updateReport: (id, status, reply) => set((s) => {
      const r = s.data.reports.find((x) => x.id === id)
      if (status !== r.status) {
        r.status = status
        r.history.push({ status, time: s.now })
      }
      if (reply !== undefined) r.reply = reply || null
      notify(s, r.renter_id, 'report', 'report_status', { status, spaceId: r.space_id }, '/r/reports')
    }),

    // ---- staff: room down -------------------------------------------------------
    markRoomDown: ({ spaceId, date, from, to, reason, bookingIds }) => set((s) => {
      const sp = s.data.spaces.find((x) => x.id === spaceId)
      sp.down = { date, from, to, reason }
      for (const id of bookingIds) {
        const b = s.data.bookings.find((x) => x.id === id)
        b.status = 'cancelled_by_staff'
        const r = findRenter(s.data, b.renter_id)
        const params = { spaceId, date: b.date, time: hm(b.start), reason }
        notify(s, r.id, 'cancel', 'staff_cancelled', params, '/r/filter')
        sendMessage(s, 'sms', r.phone, 'staff_cancelled', params, b.id)
        sendMessage(s, 'email', r.email || r.phone, 'staff_cancelled', params, b.id)
      }
      logEvent(s, 'room_down', { space: spaceId, cancelled: bookingIds.length })
    }),
    markRoomUp: (spaceId) => set((s) => { s.data.spaces.find((x) => x.id === spaceId).down = null }),

    // ---- rating, profile, no-show ------------------------------------------------
    sendRating: (rating) => set((s) => {
      s.data.ratings.push({ ...rating, time: s.now })
      delete s.pendingRating[rating.renter_id]
      logEvent(s, 'rating_sent', { visitor_id: rating.renter_id, stars: rating.stars })
    }),
    setNoShowRule: (rule) => set((s) => { s.data.settings.no_show = rule }),
    setPaused: (renterId, on) => set((s) => {
      const r = findRenter(s.data, renterId)
      r.paused_until = on ? addDays(today(s.now), 14) : null
      if (on) r.no_show_count = Math.max(r.no_show_count, s.data.settings.no_show.count)
      else r.no_show_count = 0
    }),
    markNotificationsRead: (renterId) => set((s) => { s.data.notifications.forEach((n) => { if (n.renter_id === renterId) n.read = true }) }),
  })),
)

// ---- helpers that mutate the draft state ---------------------------------------
function logEvent(s, name, extra = {}) {
  s.data.events.push({ name, visitor_id: extra.visitor_id || s.renterId || s.guestId, time: s.now, ...extra })
}
function sendMessage(s, channel, to, tpl, params = {}, bookingId) {
  s.data.messages.push({ id: uid('m'), channel, to, tpl, params, sent_at: s.now, booking_id: bookingId })
}
function notify(s, renterId, kind, tpl, params, link) {
  s.data.notifications.push({ id: uid('nt'), renter_id: renterId, kind, tpl, params, time: s.now, read: false, link })
}
function changeSeats(s, delta, source) {
  const seats = s.data.seats
  const next = Math.min(seats.total, Math.max(0, seats.taken + delta))
  if (next === seats.taken) return
  seats.taken = next
  s.data.seat_log.push({ time: s.now, change: `${delta > 0 ? '+' : ''}${delta}`, new_total: next, source, staff: 'Rana' })
}

/** Runs reminders and auto-release rules after the clock moves (#17, #18). */
function processTime(s) {
  for (const b of s.data.bookings) {
    const start = startAbs(b)
    const r = findRenter(s.data, b.renter_id)
    if (b.status === 'awaiting_confirmation' && !b.reminder_sent && b.reminder_at <= s.now && s.now < start - 60) {
      b.reminder_sent = true
      const params = { spaceId: b.space_id, time: hm(b.start), date: b.date }
      sendMessage(s, 'sms', r.phone, 'reminder', params, b.id)
      notify(s, r.id, 'reminder', 'reminder', params, `/r/reminder/${b.id}`)
    }
    if (b.status === 'awaiting_confirmation' && s.now >= start - 60) {
      release(s, b, r, 'unconfirmed')
    } else if (b.status === 'confirmed' && s.now >= start + 15) {
      release(s, b, r, 'no_checkin')
      r.no_show_count += 1
      const rule = s.data.settings.no_show
      if (r.no_show_count >= rule.count) r.paused_until = addDays(split(s.now).date, rule.pause)
    }
  }
}
function release(s, b, r, why) {
  b.status = 'released'
  b.release_reason = why
  const params = { spaceId: b.space_id, time: hm(b.start), date: b.date, why }
  sendMessage(s, 'sms', r.phone, 'released', params, b.id)
  notify(s, r.id, 'release', 'released', params, '/r/bookings')
  logEvent(s, 'auto_released', { visitor_id: r.id, why })
}
