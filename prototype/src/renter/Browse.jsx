import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useRequireLogin } from '../lib/hooks'
import { ACTIVE, REASONS, REASON_FITS, dateOf, expandDates, hoursFor, isFree, minOfDay } from '../lib/logic'
import { addDays, fmtDate, hm, weekday, weekdayName } from '../lib/time'
import { AmenityList, AmenitySheet } from '../components/Amenities'
import CalendarPicker, { DayStrip } from '../components/Calendar'
import FloorPlan from '../components/FloorPlan'
import RepeatPicker from '../components/Repeat'
import RoomSheet from '../components/RoomSheet'
import DayTimeline, { useDuration } from '../components/DayTimeline'
import { Card, Chip, Group, GroupRow, Photo, RowSelect, ScreenTitle, SectionLabel, Segmented, StatusChip } from '../components/ui'
import Icon from '../components/Icon'

const PLAN = { view: 'time', reason: '', dates: [], repeat: 'none', until: null, start: null, len: 60 }
const LENGTHS = [30, 60, 90, 120, 180]

/**
 * R-02 Book ahead: later days and repeating bookings (today is booked from Today). Two ways in:
 * By time (pick days and a time, see which rooms are free for all of them) or By room (pick a room on
 * the map, then its free days and times). Choices live in the store so they survive a trip to Review.
 */
export function BookAhead() {
  const { t } = useTranslation()
  const data = useStore((s) => s.data)
  const saved = useStore((s) => s.plan)
  const set = useStore((s) => s.set)
  const plan = { ...PLAN, ...saved }
  const setPlan = (patch) => set({ plan: { ...plan, ...patch } })
  const [open, setOpen] = useState(null)
  const amenity = data.amenities.some((a) => a.id === open)

  return (
    <div className="space-y-7 pb-4">
      <div>
        <ScreenTitle id="R-02" title={t('ahead.title')} />
        <p className="-mt-1 px-5 text-[15px] text-grey-ink">{t(plan.view === 'time' ? 'ahead.intro_time' : 'ahead.intro_room')}</p>
        <div className="mt-3 px-4">
          <Segmented
            label={t('ahead.title')}
            value={plan.view}
            onChange={(view) => setPlan({ view })}
            options={[
              ['time', t('ahead.by_time'), 'clock'],
              ['room', t('ahead.by_room'), 'map'],
            ]}
          />
        </div>
      </div>

      {/* One list for "what are you here to do?" and the booking's reason */}
      <section className="px-4">
        <SectionLabel>{t('home.how')}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <Chip key={r} active={plan.reason === r} onClick={() => setPlan({ reason: plan.reason === r ? '' : r })}>
              {t(`reason.${r}`)}
            </Chip>
          ))}
        </div>
        <p className="mt-1 px-1 text-[13px] text-grey-ink">{t('ahead.how_hint')}</p>
      </section>

      {plan.view === 'time' ? <ByTime plan={plan} setPlan={setPlan} /> : <ByRoom plan={plan} onOpen={setOpen} />}

      {amenity ? <AmenitySheet id={open} onClose={() => setOpen(null)} /> : <RoomSheet id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** Days → repeat → time → the rooms free then (all of them first). Tapping a room goes to Review. */
function ByTime({ plan, setPlan }) {
  const { t } = useTranslation()
  const L = useL()
  const dur = useDuration()
  const requireLogin = useRequireLogin()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const lang = useStore((s) => s.lang)
  const renterId = useStore((s) => s.renterId)
  const set = useStore((s) => s.set)
  const today = dateOf(now)

  const sorted = [...plan.dates].sort()
  const { dates: all, closed } = expandDates(data, sorted, plan.repeat, plan.until)
  const toggle = (d) => setPlan({ dates: plan.dates.includes(d) ? plan.dates.filter((x) => x !== d) : [...plan.dates, d] })

  // Start times run from the earliest opening to the latest closing among the picked days.
  const hrs = (sorted.length ? sorted : [addDays(today, 1)]).map((d) => hoursFor(data, d)).filter(Boolean)
  const open = hrs.length ? Math.min(...hrs.map((h) => h.open)) : 8 * 60
  const close = hrs.length ? Math.max(...hrs.map((h) => h.close)) : 18 * 60
  const starts = []
  for (let m = open; m + 30 <= close; m += 30) starts.push(m)
  const start = plan.start
  const end = start === null ? null : start + plan.len

  // A day counts when the room is free then, you have nothing else booked then, and it isn't already past.
  const mine = (it) =>
    data.bookings.some((b) => b.renter_id === renterId && b.date === it.date && ACTIVE.includes(b.status) && b.start < it.end && it.start < b.end)
  const ok = (it) => isFree(data, it.spaceId, it.date, it.start, it.end) && !mine(it) && !(it.date === today && it.start < minOfDay(now))
  const fits = plan.reason ? REASON_FITS[plan.reason] : null
  const zoneType = (zid) => data.zones.find((z) => z.id === zid).type
  const rooms =
    start === null || !all.length
      ? []
      : data.spaces
          .map((sp) => {
            const items = all.map((date) => ({ date, spaceId: sp.id, start, end }))
            return { sp, items, free: items.filter(ok).length, suits: !fits || fits.includes(zoneType(sp.zone_id)) }
          })
          .sort((a, b) => b.free - a.free)
  const suited = rooms.filter((r) => r.suits)
  const others = rooms.filter((r) => !r.suits)

  const pick = (r) => {
    set({ draft: { spaceId: r.sp.id, date: all[0], dates: all, start, end, items: r.items, reason: plan.reason, source: 'ahead' } })
    requireLogin('/r/book')
  }
  const short = (d) => fmtDate(d, lang, { weekday: 'short', day: 'numeric', month: 'short' })

  const roomRow = (r) => {
    const n = r.items.length
    const label = r.free === n ? (n === 1 ? t('legend.free') : t('ahead.free_all', { count: n })) : r.free ? t('ahead.free_some', { free: r.free, count: n }) : t('cal.taken')
    return (
      <button
        key={r.sp.id}
        disabled={!r.free}
        onClick={() => pick(r)}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start active:bg-black/[0.04] disabled:opacity-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">{L(r.sp.label)}</span>
          <span className="block truncate text-[13px] text-grey-ink">
            {t('map.people', { n: r.sp.capacity })} · {r.sp.features.map((f) => t(`feature.${f}`)).join(' · ')}
          </span>
        </span>
        <StatusChip status={r.free === n ? 'free' : r.free ? 'awaiting_confirmation' : 'booked'} label={label} />
        {r.free > 0 && <Icon name="next" size={16} className="shrink-0 text-grey-ink/60 rtl:rotate-180" />}
      </button>
    )
  }

  return (
    <>
      <section className="px-4">
        <SectionLabel>{t('ahead.days')}</SectionLabel>
        <CalendarPicker monthOnly selected={plan.dates} focus={sorted[sorted.length - 1]} onToggle={toggle} />
        <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{sorted.length ? sorted.map(short).join(' · ') : t('ahead.tap_days')}</p>
      </section>

      <div className="px-4">
        <RepeatPicker repeat={plan.repeat} until={plan.until} first={sorted[0]} onChange={setPlan} />
      </div>

      <section className="px-4">
        <SectionLabel>{t('ahead.time')}</SectionLabel>
        <Group>
          <GroupRow label={t('book.start')} htmlFor="ba-start">
            <RowSelect id="ba-start" value={start ?? ''} onChange={(e) => setPlan({ start: e.target.value === '' ? null : +e.target.value })}>
              <option value="">{t('ahead.choose_start')}</option>
              {starts.map((m) => (
                <option key={m} value={m}>
                  {hm(m)}
                </option>
              ))}
            </RowSelect>
          </GroupRow>
        </Group>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('ahead.length')}>
          {LENGTHS.map((l) => (
            <Chip key={l} active={plan.len === l} onClick={() => setPlan({ len: l })}>
              {dur(l)}
            </Chip>
          ))}
        </div>
      </section>

      <section className="px-4" aria-live="polite">
        <SectionLabel>{rooms.length ? t('ahead.rooms_for', { count: all.length }) : t('ahead.rooms')}</SectionLabel>
        {closed.length > 0 && (
          <p className="mb-2 px-1 text-[13px] text-grey-ink">
            {t('ahead.closed_skipped', { count: closed.length })}: {closed.map(short).join(', ')}
          </p>
        )}
        {!rooms.length ? (
          <p className="rounded-2xl bg-surface px-4 py-3 text-[15px] text-grey-ink">{t('ahead.pick_first')}</p>
        ) : (
          <>
            <div className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">{suited.map(roomRow)}</div>
            {others.length > 0 && (
              <>
                <SectionLabel className="mt-5">{t('ahead.other_rooms')}</SectionLabel>
                <div className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">{others.map(roomRow)}</div>
              </>
            )}
          </>
        )}
      </section>
    </>
  )
}

/** Pick the room first: on the plan or from the list. Its sheet shows a month calendar of free days. */
function ByRoom({ plan, onOpen }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const fits = plan.reason ? REASON_FITS[plan.reason] : null
  const zoneType = (zid) => data.zones.find((z) => z.id === zid).type
  const rooms = [...data.spaces].sort((a, b) => (fits ? fits.includes(zoneType(b.zone_id)) - fits.includes(zoneType(a.zone_id)) : 0))
  return (
    <>
      <section className="px-4">
        <FloorPlan plain highlight={fits} date={dateOf(now)} min={minOfDay(now)} selected={null} onSelect={onOpen} />
        <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{t('ahead.map_hint')}</p>
      </section>
      <section className="px-4">
        <SectionLabel>{t('ahead.rooms')}</SectionLabel>
        <div className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
          {rooms.map((sp) => (
            <button
              key={sp.id}
              onClick={() => onOpen(sp.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-start active:bg-black/[0.04] ${fits && !fits.includes(zoneType(sp.zone_id)) ? 'opacity-55' : ''}`}
            >
              <Photo color={sp.photos[0]} className="!w-16 shrink-0 !rounded-lg" label={L(sp.label)} />
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">{L(sp.label)}</span>
                <span className="block truncate text-[13px] text-grey-ink">
                  {t('map.people', { n: sp.capacity })} · {sp.features.map((f) => t(`feature.${f}`)).join(' · ')}
                </span>
              </span>
              <Icon name="next" size={16} className="shrink-0 text-grey-ink/60 rtl:rotate-180" />
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

/** R-03 Room details */
export function RoomDetails() {
  const { id } = useParams()
  const { t } = useTranslation()
  const L = useL()
  const requireLogin = useRequireLogin()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const set = useStore((s) => s.set)
  const [photo, setPhoto] = useState(0)
  const [day, setDay] = useState(null)
  const [range, setRange] = useState(null)
  const lang = useStore((s) => s.lang)
  const sp = data.spaces.find((s) => s.id === id)
  if (!sp) return <ScreenTitle id="R-03" title="—" back />
  const date = day || dateOf(now)
  const book = () => {
    set({ draft: { spaceId: id, date, dates: [date], start: range?.start, end: range?.end, source: 'details' } })
    requireLogin('/r/book')
  }
  return (
    <>
      <ScreenTitle id="R-03" title={L(sp.label)} back />
      <div className="space-y-4 px-4">
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
          <p className="text-center text-xs text-grey-ink">{t('details.swipe')}</p>
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
          <SectionLabel>{t('details.free_on', { date: fmtDate(date, lang, { weekday: 'long', day: 'numeric', month: 'short' }) })}</SectionLabel>
          <DayStrip
            value={date}
            onChange={(d) => {
              setDay(d)
              setRange(null)
            }}
          />
          <div className="mt-4">
            <DayTimeline spaceId={id} date={date} range={range} onChange={setRange} />
          </div>
        </section>
        <button className="btn-primary w-full" onClick={book} disabled={!!sp.down}>
          {range ? <span dir="ltr">{t('room.book_range', { from: hm(range.start), to: hm(range.end) })}</span> : t('details.book')}
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
