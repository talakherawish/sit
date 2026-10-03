import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, usePersonName, useRequireLogin } from '../lib/hooks'
import { REASONS, dateOf, defaultUntil, expandDates, hoursFor, isFree, minOfDay, roomCoverage } from '../lib/logic'
import { addDays, ceil30, fmtDate, hm, weekday, weekdayName } from '../lib/time'
import { AmenityList, AmenitySheet } from '../components/Amenities'
import CalendarPicker from '../components/Calendar'
import FloorPlan from '../components/FloorPlan'
import MonthGrid from '../components/MonthGrid'
import Receipt from '../components/Receipt'
import RepeatPicker from '../components/Repeat'
import RoomSheet from '../components/RoomSheet'
import DayTimeline, { useDuration } from '../components/DayTimeline'
import { Card, Chip, Photo, ScreenTitle, SectionLabel } from '../components/ui'
import Icon from '../components/Icon'

const PLAN = { dates: [], repeat: null, until: null, start: null, end: null, room: null, reason: '' }
// Reminder for bookings made ahead (there's no Review screen to choose one): the day before.
const AHEAD_REMINDER = '1d'

/**
 * R-02 Book ahead, as one form filled in from top to bottom: days on a month calendar → repeat
 * (weekly / monthly until a date, or none) → from / to → a room on the map (rooms free on every date
 * are highlighted, partly free ones amber, the rest faded; if no single room works, a combination
 * that covers every date is highlighted together) → what you're here to do → Confirm. Confirming
 * shows a receipt instead of a Review screen. Choices live in the store, so Room details and back
 * keeps them.
 */
export function BookAhead() {
  const { t } = useTranslation()
  const L = useL()
  const s = useStore()
  const dur = useDuration()
  const pn = usePersonName()
  const lang = s.lang
  const data = s.data
  const plan = { ...PLAN, ...s.plan }
  const setPlan = (patch) => s.set({ plan: { ...plan, ...patch } })
  const [sheet, setSheet] = useState(null) // public seating / amenity tapped on the map
  const [receipt, setReceipt] = useState(null)
  const today = dateOf(s.now)
  const short = (d) => fmtDate(d, lang, { weekday: 'short', day: 'numeric', month: 'short' })

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

  // Which rooms work for those dates and times.
  const ready = all.length > 0 && plan.start !== null && plan.end !== null
  const cov = ready ? roomCoverage(data, all, plan.start, plan.end, s.renterId, s.now) : null
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

  const onMap = (id) => {
    if (data.spaces.some((sp) => sp.id === id)) setPlan({ room: room === id ? null : id })
    else setSheet(id)
  }

  const confirm = () => {
    if (!s.renterId) return s.set({ gate: { returnTo: '/r/list' } })
    const { ids, clashes } = s.createBooking(
      {
        renterId: s.renterId,
        items,
        dates: items.map((it) => it.date),
        date: items[0].date,
        spaceId: items[0].spaceId,
        start: plan.start,
        end: plan.end,
        reason: plan.reason,
        reminder: AHEAD_REMINDER,
      },
      { source: 'ahead' },
    )
    const me = data.renters.find((r) => r.id === s.renterId)
    if (!ids.length) return s.showToast('toast.err_nothing_booked', { name: pn(me, true), count: clashes })
    const made = useStore.getState().data.bookings.filter((b) => ids.includes(b.id))
    setReceipt({ ids, bookings: made, email: me.email || me.phone, reminder: made.some((b) => b.reminder) ? AHEAD_REMINDER : null })
  }
  const done = () => {
    if (!receipt) return
    const { ids } = receipt
    setReceipt(null)
    s.set({ plan: null })
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
    s.showToast('toast.booked', {}, () => useStore.getState().removeBookings(ids))
  }

  const pickedRooms = room === 'combo' ? combo : room ? [room] : []

  return (
    <div className="space-y-8 pb-4">
      <ScreenTitle id="R-02" title={t('ahead.title')} />

      {/* 1 Days */}
      <section className="-mt-4 px-4">
        <SectionLabel>{t('ahead.days')}</SectionLabel>
        <CalendarPicker monthOnly selected={plan.dates} focus={sorted[sorted.length - 1]} onToggle={toggle} />
        <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{sorted.length ? sorted.map(short).join(' · ') : t('ahead.tap_days')}</p>
      </section>

      {/* 2 Repeat */}
      <div className="px-4">
        <RepeatPicker repeat={repeat} until={until} first={first} onChange={setPlan} />
        {repeat && all.length > 0 && (
          <p className="mt-1.5 px-1 text-[13px] text-grey-ink">
            <span className="font-medium text-ink">{t('ahead.n_dates', { count: all.length })}</span> · {short(all[0])} – {short(all[all.length - 1])}
            {closed.length > 0 && ` · ${t('ahead.closed_skipped', { count: closed.length })}`}
          </p>
        )}
      </div>

      {/* 3 Time */}
      <section className="px-4">
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

      {/* 4 Room */}
      <section className="px-4" aria-live="polite">
        <SectionLabel>{t('ahead.room')}</SectionLabel>
        {!ready && <p className="mb-2 px-1 text-[13px] text-grey-ink">{t('ahead.pick_first')}</p>}
        {ready && !full.length && combo && (
          <div className="mb-3 rounded-2xl bg-navy/[0.06] px-4 py-3">
            <p className="text-[15px] font-semibold">{t(all.length === 2 ? 'ahead.combo_title_both' : 'ahead.combo_title', { count: all.length })}</p>
            <p className="text-[15px]">{t('ahead.combo_body', { rooms: combo.map((id) => name(data, L, id)).join(' + ') })}</p>
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
                  <Link to={`/r/room/${id}`} className="btn-link shrink-0 !text-[15px]">
                    {t('ahead.details')}
                    <Icon name="next" size={16} className="rtl:rotate-180" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 5 What are you here to do? */}
      <section className="px-4">
        <SectionLabel>
          {t('home.how')} <span className="font-normal text-grey-ink">· {t('review.optional')}</span>
        </SectionLabel>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <Chip key={r} active={plan.reason === r} onClick={() => setPlan({ reason: plan.reason === r ? '' : r })}>
              {t(`reason.${r}`)}
            </Chip>
          ))}
        </div>
      </section>

      {/* 6 Confirm: a receipt instead of a Review screen */}
      <div className="space-y-2 px-4">
        {skipped > 0 && <p className="rounded-2xl bg-amber/15 px-4 py-2.5 text-[13px] text-[#7a4f00]">{t('ahead.skipped_note', { count: skipped })}</p>}
        <button className="btn-primary w-full" disabled={!items.length} onClick={confirm}>
          {items.length > 1 ? t('review.confirm_n', { count: items.length }) : t('review.confirm')}
        </button>
        {items.length > 0 && <p className="px-1 text-center text-[13px] text-grey-ink">{t('ahead.reminder_note')}</p>}
      </div>

      {sheet &&
        (data.amenities.some((a) => a.id === sheet) ? (
          <AmenitySheet id={sheet} onClose={() => setSheet(null)} />
        ) : (
          <RoomSheet id={sheet} onClose={() => setSheet(null)} />
        ))}
      {receipt && <Receipt bookings={receipt.bookings} email={receipt.email} reminder={receipt.reminder} onDone={done} />}
    </div>
  )
}

const name = (data, L, id) => L(data.spaces.find((x) => x.id === id).label)

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

/**
 * R-03 Room details: photos, what's in the room, and this room's availability: a month calendar with
 * a dot per day (teal = has free time, amber = under an hour left, grey = fully booked), and the
 * picked day's bookings as a timeline. Book takes you to Review (today) or into the Book ahead form.
 */
export function RoomDetails() {
  const { id } = useParams()
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const lang = useStore((s) => s.lang)
  const plan = useStore((s) => s.plan)
  const set = useStore((s) => s.set)
  const dur = useDuration()
  const today = dateOf(now)
  const [photo, setPhoto] = useState(0)
  const [day, setDay] = useState(today)
  const [range, setRange] = useState(null)
  const sp = data.spaces.find((s) => s.id === id)
  if (!sp) return <ScreenTitle id="R-03" title="—" back />

  const last = addDays(today, 60)
  const closed = (d) => d < today || d > last || !hoursFor(data, d)
  // Free minutes left on a day (today: from now on).
  const freeMins = (d) => {
    const h = hoursFor(data, d)
    if (!h) return 0
    let n = 0
    for (let m = d === today ? Math.max(h.open, ceil30(minOfDay(now))) : h.open; m + 30 <= h.close; m += 30) if (isFree(data, id, d, m, m + 30)) n += 30
    return n
  }
  const dot = (d) => {
    if (closed(d)) return []
    const n = freeMins(d)
    return [n >= 60 ? 'bg-teal' : n > 0 ? 'bg-amber' : 'bg-grey/40']
  }
  const book = () => {
    if (day === today && range) {
      set({ draft: { spaceId: id, date: today, dates: [today], start: range.start, end: range.end, source: 'details' } })
      return requireLogin('/r/book')
    }
    // Later days: into the Book ahead form with this room, the day and (if picked) the time filled in.
    const p = plan || {}
    set({ plan: { ...p, room: id, dates: p.dates?.length ? p.dates : [day], start: range?.start ?? p.start ?? null, end: range?.end ?? p.end ?? null } })
    navigate('/r/list')
  }

  return (
    <>
      <ScreenTitle id="R-03" title={L(sp.label)} back />
      <div className="space-y-6 px-4">
        <div>
          <div
            className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto"
            dir="ltr"
            onScroll={(e) => setPhoto(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          >
            {sp.photos.map((c, i) => (
              <div key={i} className="w-full shrink-0 snap-center">
                <Photo color={c} i={i} label={t('details.photo', { n: i + 1, room: L(sp.label) })} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
            {sp.photos.map((_, i) => (
              <span key={i} className={`size-2 rounded-full ${i === photo ? 'bg-navy' : 'bg-grey/40'}`} />
            ))}
          </div>
        </div>
        {sp.down && (
          <p className="rounded-lg bg-red/10 p-3 font-medium text-[#a32f2f]">
            {t('room.down')}: {sp.down.reason}
          </p>
        )}
        <Card>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs text-grey-ink">{t('details.size')}</dt>
              <dd className="font-head text-xl font-bold">{sp.size_m2} m²</dd>
            </div>
            <div>
              <dt className="text-xs text-grey-ink">{t('details.capacity')}</dt>
              <dd className="font-head text-xl font-bold">{sp.capacity}</dd>
            </div>
            <div>
              <dt className="text-xs text-grey-ink">{t('details.type')}</dt>
              <dd className="font-semibold">{t(`kind.${sp.kind}`)}</dd>
            </div>
          </dl>
          <h3 className="mt-3 mb-1 text-sm font-semibold">{t('details.amenities')}</h3>
          <ul className="flex flex-wrap gap-2">
            {sp.features.map((f) => (
              <li key={f} className="rounded-full bg-surface px-3 py-1 text-sm">
                {t(`feature.${f}`)}
              </li>
            ))}
          </ul>
        </Card>

        <section>
          <SectionLabel>{t('details.availability')}</SectionLabel>
          <MonthGrid
            value={day}
            onPick={(d) => {
              setDay(d)
              setRange(null)
            }}
            disabled={closed}
            dots={dot}
            describe={(d) => (closed(d) ? t('common.closed') : freeMins(d) ? t('details.free_left', { time: dur(freeMins(d)) }) : t('details.full'))}
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] text-grey-ink">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-teal" />
              {t('details.legend_free')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber" />
              {t('details.legend_little')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-grey/40" />
              {t('details.full')}
            </span>
          </div>
        </section>

        <section>
          <SectionLabel>{fmtDate(day, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</SectionLabel>
          <DayTimeline spaceId={id} date={day} range={range} onChange={setRange} />
        </section>

        <button className="btn-primary w-full" onClick={book} disabled={!!sp.down}>
          {range ? <span dir="ltr">{t('room.book_range', { from: hm(range.start), to: hm(range.end) })}</span> : t('details.book_room')}
        </button>
        <button
          className="btn-link"
          onClick={() => {
            set({ reportSpace: id, reportBooking: null })
            requireLogin('/r/report')
          }}
        >
          <Icon name="flag" size={18} />
          {t('details.report')}
        </button>
      </div>
    </>
  )
}

/** R-04 Opening hours */
export function Hours() {
  const { t } = useTranslation()
  const L = useL()
  const lang = useStore((s) => s.lang)
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const todayWd = weekday(dateOf(now))
  const [amenity, setAmenity] = useState(null)
  return (
    <>
      <ScreenTitle id="R-04" title={t('hours.title')} back />
      {amenity && <AmenitySheet id={amenity} onClose={() => setAmenity(null)} />}
      <div className="space-y-4 px-4">
        <Card>
          <table className="w-full">
            <tbody>
              {[0, 1, 2, 3, 4, 5, 6].map((wd) => {
                const h = data.opening_hours.find((o) => o.weekday === wd)
                return (
                  <tr key={wd} className={`border-b border-grey/10 last:border-0 ${wd === todayWd ? 'font-semibold' : ''}`}>
                    <td className="py-2">
                      {weekdayName(wd, lang)}
                      {wd === todayWd ? ` · ${t('hours.today')}` : ''}
                    </td>
                    <td className="py-2 text-end" dir="ltr">
                      {h.open !== null ? `${hm(h.open)}–${hm(h.close)}` : t('common.closed')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
        <section>
          <h2 className="mb-2 px-1 text-[15px] font-semibold">{t('amenity.title')}</h2>
          <AmenityList onOpen={setAmenity} />
        </section>
        <section>
          <h2 className="mb-2 font-head text-xl font-bold">{t('hours.closed_days')}</h2>
          <ul className="space-y-2">
            {data.closed_days.map((c) => (
              <li key={c.date} className="flex justify-between rounded-2xl bg-surface p-4">
                <span>{L(c.reason)}</span>
                <span className="font-semibold">{fmtDate(c.date, lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
