import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, usePersonName } from '../lib/hooks'
import { REASONS, dateOf, defaultUntil, expandDates, hoursFor, minOfDay, roomCoverage } from '../lib/logic'
import { addDays, fmtDate, hm } from '../lib/time'
import { AmenitySheet } from './Amenities'
import CalendarPicker from './Calendar'
import FloorPlan from './FloorPlan'
import Receipt from './Receipt'
import RepeatPicker from './Repeat'
import RoomSheet from './RoomSheet'
import { useDuration } from './DayTimeline'
import { Chip, SectionLabel } from './ui'
import Icon from './Icon'

const PLAN = { dates: [], repeat: null, until: null, start: null, end: null, room: null, reason: '' }
// Bookings made ahead have no Review screen to choose a reminder on: they're reminded the day before.
export const AHEAD_REMINDER = '1d'

/**
 * The booking form shared by the renter's Book ahead (R-02) and reception's Book for someone (S-07),
 * filled in from top to bottom: days on a month calendar → repeat (weekly / monthly until a date, or
 * none) → from / to → a room on the map (rooms free on every date highlighted, partly free ones amber,
 * the rest faded; if no single room works, a combination that covers every date is highlighted
 * together) → what they're here to do → Confirm, which shows a receipt instead of a Review screen.
 *
 * - `renterId`: who it's for (null = guest on the renter app, or nobody picked yet at reception).
 * - `planKey`: where the choices live in the store, so leaving and coming back keeps them.
 * - `desk`: two columns for the reception screen (form on the left, map and Confirm on the right).
 * - `before`: rendered above the days (reception's "Who is it for?").
 * - `roomLink(id)`: the link on the picked room's card (Room details / See availability).
 * - `onNoRenter`: what Confirm does with nobody picked (the renter app opens the login sheet);
 *   without it, Confirm stays disabled with a hint.
 */
export default function BookingPlanner({ renterId, planKey = 'plan', desk = false, before, roomLink, onNoRenter, createdBy = 'renter', source = 'ahead' }) {
  const { t } = useTranslation()
  const L = useL()
  const s = useStore()
  const dur = useDuration()
  const pn = usePersonName()
  const lang = s.lang
  const data = s.data
  const plan = { ...PLAN, ...s[planKey] }
  const setPlan = (patch) => s.set({ [planKey]: { ...plan, ...patch } })
  const [sheet, setSheet] = useState(null) // public seating / amenity tapped on the map
  const [receipt, setReceipt] = useState(null)
  const today = dateOf(s.now)
  const short = (d) => fmtDate(d, lang, { weekday: 'short', day: 'numeric', month: 'short' })
  const pad = desk ? '' : 'px-4'
  const renter = data.renters.find((r) => r.id === renterId)

  // Days and repeat. If the first day moves past Until, Until starts again from its default.
  const sorted = [...plan.dates].sort()
  const first = sorted[0]
  const until = plan.repeat && first ? (plan.until && plan.until > first ? plan.until : defaultUntil(first, plan.repeat)) : null
  const repeat = first ? plan.repeat : null
  const { dates: all, closed } = expandDates(data, sorted, repeat, until)
  const toggle = (d) => setPlan({ dates: plan.dates.includes(d) ? plan.dates.filter((x) => x !== d) : [...plan.dates, d] })

  // From / To: half hours from the earliest opening to the latest closing among the picked days.
  const hrs = (sorted.length ? sorted : [addDays(today, 1)]).map((d) => hoursFor(data, d)).filter(Boolean)
  const open = hrs.length ? Math.min(...hrs.map((h) => h.open)) : 8 * 60
  const close = hrs.length ? Math.max(...hrs.map((h) => h.close)) : 18 * 60
  const froms = []
  for (let m = open; m + 30 <= close; m += 30) froms.push(m)
  const tos = []
  if (plan.start !== null) for (let m = plan.start + 30; m <= close; m += 30) tos.push(m)
  const setFrom = (v) => {
    const start = v === '' ? null : +v
    const end = start === null ? plan.end : plan.end && plan.end > start ? plan.end : Math.min(start + 60, close)
    setPlan({ start, end })
  }

  // Which rooms work for those dates and times (for this renter: their other bookings count as clashes).
  const ready = all.length > 0 && plan.start !== null && plan.end !== null
  const cov = ready ? roomCoverage(data, all, plan.start, plan.end, renterId, s.now) : null
  const full = cov ? cov.rooms.filter((r) => r.free.length === all.length) : []
  const combo = cov?.combo || null
  const room = plan.room === 'combo' && !combo ? null : plan.room
  const freeOf = (id) => cov?.rooms.find((r) => r.id === id)?.free || []
  const marks = cov
    ? Object.fromEntries(
        cov.rooms.map((r) => {
          const n = r.free.length
          const tone = n === all.length ? 'full' : combo?.includes(r.id) ? 'combo' : n ? 'partial' : 'none'
          return [
            r.id,
            { tone, label: n === all.length ? (n > 1 ? t('ahead.all_n', { count: n }) : t('legend.free')) : n ? `${n} / ${all.length}` : t('cal.taken') },
          ]
        }),
      )
    : undefined

  // What gets booked: the room's free dates (others skipped), or each date in the first combination room free then.
  const items = !ready
    ? []
    : room === 'combo'
      ? all.map((date) => ({ date, spaceId: combo.find((id) => freeOf(id).includes(date)), start: plan.start, end: plan.end })).filter((it) => it.spaceId)
      : room
        ? freeOf(room).map((date) => ({ date, spaceId: room, start: plan.start, end: plan.end }))
        : []
  const skipped = ready && room ? all.length - items.length : 0
  const needsRenter = !renterId && !onNoRenter
  const pickedRooms = room === 'combo' ? combo : room ? [room] : []

  const onMap = (id) => {
    if (data.spaces.some((sp) => sp.id === id)) setPlan({ room: room === id ? null : id })
    else setSheet(id)
  }

  const confirm = () => {
    if (!renterId) return onNoRenter?.()
    const { ids, clashes } = s.createBooking(
      {
        renterId,
        items,
        dates: items.map((it) => it.date),
        date: items[0].date,
        spaceId: items[0].spaceId,
        start: plan.start,
        end: plan.end,
        reason: plan.reason,
        reminder: AHEAD_REMINDER,
      },
      { createdBy, source },
    )
    if (!ids.length) return s.showToast('toast.err_nothing_booked', { name: pn(renter, true), count: clashes })
    const made = useStore.getState().data.bookings.filter((b) => ids.includes(b.id))
    // Clear the form straight away, so what's behind the receipt is a fresh form, not "nothing free".
    s.set({ [planKey]: null })
    setReceipt({ ids, bookings: made, email: renter.email || renter.phone, reminder: made.some((b) => b.reminder) ? AHEAD_REMINDER : null })
  }
  const done = () => {
    if (!receipt) return
    const { ids } = receipt
    setReceipt(null)
    // The renter app's visible swipe panel, else the page itself (staff)
    ;(document.querySelector('[data-scroller]:not([inert])') || document.querySelector('main'))?.scrollTo({ top: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const undo = () => useStore.getState().removeBookings(ids)
    if (createdBy === 'staff') s.showToast('toast.staff_booked', { name: pn(renter) }, undo)
    else s.showToast('toast.booked', {}, undo)
  }

  const days = (
    <section className={pad}>
      <CalendarPicker monthOnly selected={plan.dates} focus={sorted[sorted.length - 1]} onToggle={toggle} />
      <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{sorted.length ? sorted.map(short).join(' · ') : t('ahead.tap_days')}</p>
    </section>
  )

  const repeatRow = (
    <div className={pad}>
      <RepeatPicker repeat={repeat} until={until} first={first} onChange={setPlan} />
      {repeat && all.length > 0 && (
        <p className="mt-1.5 px-1 text-[13px] text-grey-ink">
          <span className="font-medium text-ink">{t('ahead.n_dates', { count: all.length })}</span> · {short(all[0])} – {short(all[all.length - 1])}
          {closed.length > 0 && ` · ${t('ahead.closed_skipped', { count: closed.length })}`}
        </p>
      )}
    </div>
  )

  const time = (
    <section className={pad}>
      <SectionLabel>{t('ahead.time')}</SectionLabel>
      <div className="flex gap-2">
        <TimeField label={t('ahead.from')} value={plan.start} options={froms} onChange={setFrom} />
        <TimeField
          label={t('ahead.to')}
          value={plan.end}
          options={tos}
          disabled={plan.start === null}
          onChange={(v) => setPlan({ end: v === '' ? null : +v })}
        />
      </div>
      {plan.start !== null && plan.end !== null && <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{dur(plan.end - plan.start)}</p>}
    </section>
  )

  const roomPicker = (
    <section className={pad} aria-live="polite">
      <SectionLabel>{t('ahead.room')}</SectionLabel>
      {!ready && <p className="mb-2 px-1 text-[13px] text-grey-ink">{t('ahead.pick_first')}</p>}
      {ready && !full.length && combo && (
        <div className="mb-3 rounded-2xl bg-navy/[0.06] px-4 py-3">
          <p className="text-[15px] font-semibold">{t(all.length === 2 ? 'ahead.combo_title_both' : 'ahead.combo_title', { count: all.length })}</p>
          <p className="text-[15px]">{t('ahead.combo_body', { rooms: combo.map((id) => L(data.spaces.find((x) => x.id === id).label)).join(' + ') })}</p>
          <button
            className={`mt-2 min-h-10 rounded-full px-4 text-[15px] font-semibold ${room === 'combo' ? 'bg-navy text-white' : 'bg-white text-navy'}`}
            onClick={() => setPlan({ room: room === 'combo' ? null : 'combo' })}
          >
            {room === 'combo' ? t('ahead.combo_using') : t('ahead.combo_use')}
          </button>
        </div>
      )}
      {ready && !full.length && !combo && !cov.rooms.some((r) => r.free.length) && (
        <p className="mb-3 rounded-2xl bg-amber/15 px-4 py-3 text-[15px] text-[#7a4f00]">{t('ahead.none_free')}</p>
      )}
      <FloorPlan date={today} min={minOfDay(s.now)} plain={!ready} marks={marks} selected={pickedRooms} onSelect={onMap} />
      {ready && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] text-grey-ink">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[4px] bg-[#E3EAF5] ring-1 ring-navy/30" />
            {combo && !full.length ? t('ahead.legend_combo') : t('ahead.legend_full')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[4px] bg-[#FBEFD8] ring-1 ring-amber/50" />
            {t('ahead.legend_partial')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[4px] bg-white opacity-50 ring-1 ring-black/20" />
            {t('ahead.legend_none')}
          </span>
        </div>
      )}
      {pickedRooms.length > 0 && (
        <div className="mt-3 divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
          {pickedRooms.map((id) => {
            const sp = data.spaces.find((x) => x.id === id)
            const n = room === 'combo' ? items.filter((it) => it.spaceId === id).length : freeOf(id).length
            return (
              <div key={id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold">{L(sp.label)}</span>
                  <span className="block truncate text-[13px] text-grey-ink">
                    {t('map.people', { n: sp.capacity })} · {sp.features.map((f) => t(`feature.${f}`)).join(' · ')}
                  </span>
                  {ready && (
                    <span
                      className={`block text-[13px] font-medium ${room === 'combo' || n === all.length ? 'text-navy' : n ? 'text-[#7a4f00]' : 'text-[#a32f2f]'}`}
                    >
                      {room === 'combo'
                        ? t('ahead.combo_share', { count: n })
                        : n === all.length
                          ? t('ahead.all_dates', { count: n })
                          : n
                            ? t('ahead.some_dates', { free: n, count: all.length })
                            : t('ahead.no_dates')}
                    </span>
                  )}
                </span>
                {roomLink?.(id)}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )

  const reason = (
    <section className={pad}>
      <SectionLabel>
        {t(createdBy === 'staff' ? 'staff_book.how' : 'home.how')} <span className="font-normal text-grey-ink">· {t('review.optional')}</span>
      </SectionLabel>
      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <Chip key={r} active={plan.reason === r} onClick={() => setPlan({ reason: plan.reason === r ? '' : r })}>
            {t(`reason.${r}`)}
          </Chip>
        ))}
      </div>
    </section>
  )

  const confirmRow = (
    <div className={`space-y-2 ${pad}`}>
      {skipped > 0 && <p className="rounded-2xl bg-amber/15 px-4 py-2.5 text-[13px] text-[#7a4f00]">{t('ahead.skipped_note', { count: skipped })}</p>}
      <button className="btn-primary w-full" disabled={!items.length || needsRenter} onClick={confirm}>
        {renter && createdBy === 'staff'
          ? t('staff_book.confirm_for', { count: items.length || 1, name: pn(renter, true) })
          : items.length > 1
            ? t('review.confirm_n', { count: items.length })
            : t('review.confirm')}
      </button>
      {needsRenter ? (
        <p className="px-1 text-center text-[13px] text-grey-ink">{t('staff_book.pick_renter_first')}</p>
      ) : (
        items.length > 0 && (
          <p className="px-1 text-center text-[13px] text-grey-ink">{t(createdBy === 'staff' ? 'staff_book.reminder_note' : 'ahead.reminder_note')}</p>
        )
      )}
    </div>
  )

  return (
    <>
      {desk ? (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-8">
            {before}
            {days}
            {repeatRow}
            {time}
          </div>
          <div className="space-y-8">
            {roomPicker}
            {reason}
            {confirmRow}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {before}
          {days}
          {repeatRow}
          {time}
          {roomPicker}
          {reason}
          {confirmRow}
        </div>
      )}
      {sheet &&
        (data.amenities.some((a) => a.id === sheet) ? (
          <AmenitySheet id={sheet} onClose={() => setSheet(null)} />
        ) : (
          <RoomSheet id={sheet} onClose={() => setSheet(null)} />
        ))}
      {receipt && (
        <Receipt
          bookings={receipt.bookings}
          email={receipt.email}
          reminder={receipt.reminder}
          forName={createdBy === 'staff' ? pn(renter) : null}
          onDone={done}
        />
      )}
    </>
  )
}

/** One half of the From / To row: a native time list styled as a field. */
function TimeField({ label, value, options, onChange, disabled }) {
  return (
    <label className={`flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-surface px-4 ${disabled ? 'opacity-50' : ''}`}>
      <span className="shrink-0 text-[15px] text-grey-ink">{label}</span>
      <select
        className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-end text-[17px] font-semibold text-ink tabular-nums outline-none"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">--:--</option>
        {options.map((m) => (
          <option key={m} value={m}>
            {hm(m)}
          </option>
        ))}
      </select>
      <Icon name="chevrons" size={14} className="shrink-0 text-grey-ink/70" />
    </label>
  )
}
