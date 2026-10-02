import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useRequireLogin } from '../lib/hooks'
import { hoursFor, isFree, stateAt, nextFreeAt, dateOf, minOfDay, ACTIVE } from '../lib/logic'
import { addDays, fmtDate, hm, weekday, weekdayName, ceil30 } from '../lib/time'
import { AmenityList, AmenitySheet } from '../components/Amenities'
import CalendarPicker, { DayStrip } from '../components/Calendar'
import { WhenBar, useWhen } from '../components/Browse'
import RoomSheet from '../components/RoomSheet'
import DayTimeline from '../components/DayTimeline'
import RoomsCalendar from '../components/RoomsCalendar'
import { Card, Chip, Group, GroupRow, PhaseBadge, Photo, RowSelect, ScreenTitle, SectionLabel, Segmented, StatusChip } from '../components/ui'
import Icon from '../components/Icon'

/** R-02 Rooms: the same rooms as the map, as a list. Tapping one opens the same booking sheet. */
export function SpacesList() {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const when = useWhen()
  const [open, setOpen] = useState(null)
  const [view, setView] = useState('day') // day | list
  const [calDay, setCalDay] = useState(when.date)
  const [preset, setPreset] = useState(null) // { day, range } when opened from a free slot in the day view
  const pub = data.zones.find((z) => z.type === 'public_seating')
  const groups = [
    ['focus_room', t('list.focus_rooms')],
    ['big_room', t('list.big_rooms')],
  ]
  const amenity = data.amenities.some((a) => a.id === open)
  return (
    <div className="space-y-7 pb-4">
      <div>
        <ScreenTitle id="R-02" title={t('list.title')} />
        <p className="-mt-1 px-5 text-[15px] text-grey-ink">{t(view === 'day' ? 'rooms_cal.intro' : 'list.intro')}</p>
        <div className="mt-3 px-4">
          <Segmented
            label={t('list.title')}
            value={view}
            onChange={setView}
            options={[
              ['day', t('rooms_cal.day_view'), 'calendar'],
              ['list', t('rooms_cal.list_view'), 'list'],
            ]}
          />
        </div>
        {view === 'list' && (
          <div className="mt-3">
            <WhenBar />
          </div>
        )}
      </div>

      {view === 'day' && (
        <section className="-mt-3">
          <div className="px-4">
            <DayStrip value={calDay} onChange={setCalDay} />
            <div className="mt-3 flex items-center justify-between gap-2 px-1 text-[13px] whitespace-nowrap text-grey-ink">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[4px] bg-white ring-1 ring-black/15" />
                {t('legend.free')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[4px] bg-[#E4E6EB]" />
                {t('legend.booked')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[4px] bg-teal/25" />
                {t('rooms_cal.yours')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="hatch size-3 rounded-[4px]" />
                {t('legend.down')}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <RoomsCalendar
              date={calDay}
              onPick={(id, range) => {
                setPreset({ day: calDay, range })
                setOpen(id)
              }}
            />
          </div>
        </section>
      )}

      {view === 'list' &&
        groups.map(([kind, title]) => (
          <section key={kind} className="px-4">
            <SectionLabel>{title}</SectionLabel>
            <div className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
              {data.spaces
                .filter((s) => s.kind === kind)
                .map((sp) => {
                  const st = stateAt(data, sp.id, when.date, when.min)
                  const nf = st.state === 'booked' ? nextFreeAt(data, sp.id, when.date, when.min) : null
                  return (
                    <button key={sp.id} onClick={() => setOpen(sp.id)} className="flex w-full items-center gap-3 px-4 py-3 text-start active:bg-black/[0.04]">
                      <Photo color={sp.photos[0]} className="!w-16 shrink-0 !rounded-lg" label={L(sp.label)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[17px] font-semibold">{L(sp.label)}</span>
                        <span className="block truncate text-[13px] text-grey-ink">
                          {t('map.people', { n: sp.capacity })} · {sp.features.map((f) => t(`feature.${f}`)).join(' · ')}
                        </span>
                        <span className="mt-0.5 block">
                          {st.state === 'free' ? (
                            <StatusChip status="free" label={when.isNow ? t('list.free_now') : t('legend.free')} />
                          ) : st.state === 'down' ? (
                            <StatusChip status="down" label={t('map.down')} />
                          ) : (
                            <StatusChip status="booked" label={nf !== null ? t('list.free_from', { time: hm(nf) }) : t('map.booked')} />
                          )}
                        </span>
                      </span>
                      <Icon name="next" size={16} className="shrink-0 text-grey-ink/60 rtl:rotate-180" />
                    </button>
                  )
                })}
            </div>
          </section>
        ))}

      {view === 'list' && (
        <>
          <section className="px-4">
            <SectionLabel>{t('list.walk_in')}</SectionLabel>
            <button
              onClick={() => setOpen('public')}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-surface px-4 text-start active:bg-black/[0.04]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">{L(pub.name)}</span>
                <span className="block text-[13px] text-grey-ink">{t('home.not_bookable')}</span>
              </span>
              <span className="text-[15px] font-semibold tabular-nums" dir="ltr">
                {data.seats.taken} / {data.seats.total}
              </span>
              <Icon name="next" size={16} className="shrink-0 text-grey-ink/60 rtl:rotate-180" />
            </button>
          </section>

          <section className="px-4">
            <SectionLabel>{t('amenity.title')}</SectionLabel>
            <AmenityList onOpen={setOpen} />
          </section>
        </>
      )}

      {amenity ? (
        <AmenitySheet id={open} onClose={() => setOpen(null)} />
      ) : (
        <RoomSheet
          id={open}
          day={preset?.day}
          range={preset?.range}
          onClose={() => {
            setOpen(null)
            setPreset(null)
          }}
          onJump={(id) => {
            setPreset(null)
            setOpen(id)
          }}
        />
      )}
    </div>
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
            set({ reportSpace: id })
            requireLogin('/r/report')
          }}
        >
          <Icon name="flag" size={18} />
          {t('details.report')} <PhaseBadge phase="next" />
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

/**
 * R-05 Book a room without the map: pick days (one day, weekly, or any days), a time and a size.
 * One day lists the free rooms. Several days become a plan where every day has its own time and
 * room, starting from the same time and room wherever that's free.
 */
export function FilterRooms() {
  const { t } = useTranslation()
  const L = useL()
  const requireLogin = useRequireLogin()
  const lang = useStore((s) => s.lang)
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const mode = useStore((s) => s.mode)
  const renterId = useStore((s) => s.renterId)
  const set = useStore((s) => s.set)
  const today = dateOf(now)
  const firstOpen = Array.from({ length: 14 }, (_, i) => addDays(today, i)).find((d) => hoursFor(data, d))
  const openWeekdays = data.opening_hours.filter((o) => o.open !== null && o.open !== false).map((o) => o.weekday)

  const [pattern, setPattern] = useState('one') // one | weekly | pick
  const [day, setDay] = useState(firstOpen)
  const [weekdays, setWeekdays] = useState([weekday(firstOpen)])
  const [weeks, setWeeks] = useState(4)
  const [picked, setPicked] = useState([firstOpen])
  const [start, setStart] = useState(null)
  const [dur, setDur] = useState(60)
  const [size, setSize] = useState('any')
  const [overrides, setOverrides] = useState({}) // date -> { start, end, spaceId } changed on that day only

  const dates = (() => {
    if (pattern === 'one') return [day]
    if (pattern === 'pick') return [...picked].sort()
    const out = []
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(today, i)
      if (weekdays.includes(weekday(d)) && hoursFor(data, d)) out.push(d)
    }
    return out
  })()

  const fits = (sp) => size === 'any' || (size === 'small' ? sp.kind === 'focus_room' : sp.kind === 'big_room')
  const startsOn = (d, len) => {
    const h = hoursFor(data, d)
    const out = []
    if (h) for (let m = h.open; m + len <= h.close; m += 30) if (d !== today || m >= ceil30(minOfDay(now))) out.push(m)
    return out
  }
  const mine = (d, s, e) => data.bookings.some((b) => b.renter_id === renterId && b.date === d && ACTIVE.includes(b.status) && b.start < e && s < b.end)
  const freeRooms = (d, s, e) => data.spaces.filter((sp) => fits(sp) && isFree(data, sp.id, d, s, e))

  const first = dates[0]
  const times = first ? startsOn(first, dur) : []
  // Until a time is chosen, start at the first time you are free and some room is too.
  const okAt = (d, m) => !mine(d, m, m + dur) && freeRooms(d, m, m + dur).length > 0
  const st = times.includes(start) ? start : (times.find((m) => okAt(first, m)) ?? times[0])

  // Default room for the plan: the suitable room free on the most days at the usual time.
  const usualStart = (d) => (startsOn(d, dur).includes(st) ? st : startsOn(d, dur)[0])
  const preferred = data.spaces
    .filter(fits)
    .map((sp) => ({ id: sp.id, n: dates.filter((d) => usualStart(d) !== undefined && isFree(data, sp.id, d, usualStart(d), usualStart(d) + dur)).length }))
    .sort((a, b) => b.n - a.n)[0]?.id

  const plan = dates.map((d) => {
    const o = overrides[d] || {}
    const h = hoursFor(data, d)
    const s = o.start ?? usualStart(d)
    const e = s === undefined ? undefined : Math.min(o.end ?? s + dur, h.close)
    const options = s === undefined ? [] : freeRooms(d, s, e)
    const clash = s !== undefined && mine(d, s, e)
    const room = clash ? null : options.find((sp) => sp.id === o.spaceId) || options.find((sp) => sp.id === preferred) || options[0] || null
    return { date: d, start: s, end: e, room, options, clash }
  })
  const ready = plan.filter((p) => p.room)
  const change = (d, patch) => setOverrides({ ...overrides, [d]: { ...overrides[d], ...patch } })

  const reasonNow = data.work_modes.find((m) => m.id === mode)?.default_reason || ''
  const go = (items) => {
    set({ draft: { ...items[0], items, dates: items.map((it) => it.date), reason: reasonNow, source: 'filter' } })
    requireLogin('/r/book')
  }
  const short = (d) => fmtDate(d, lang, { weekday: 'short', day: 'numeric', month: 'short' })
  const step = (n, label) => `${n} · ${label}`
  const single = dates.length === 1

  return (
    <>
      <ScreenTitle id="R-05" title={t('filter.title')} phase="next" back />
      <div className="space-y-6 px-4 pb-4">
        <section>
          <SectionLabel>{step(1, t('filter.days'))}</SectionLabel>
          <Segmented
            className="mb-3"
            label={t('filter.days')}
            value={pattern}
            onChange={setPattern}
            options={[
              ['one', t('filter.p_one')],
              ['weekly', t('filter.p_weekly')],
              ['pick', t('filter.p_pick')],
            ]}
          />

          {pattern === 'one' && <DayStrip value={day} onChange={setDay} />}

          {pattern === 'weekly' && (
            <div className="space-y-3 rounded-2xl bg-surface p-4">
              <p className="text-[15px]">{t('filter.every')}</p>
              <div className="flex justify-between gap-1">
                {openWeekdays.map((wd) => {
                  const on = weekdays.includes(wd)
                  return (
                    <button
                      type="button"
                      key={wd}
                      aria-pressed={on}
                      aria-label={weekdayName(wd, lang)}
                      onClick={() => setWeekdays(on ? weekdays.filter((x) => x !== wd) : [...weekdays, wd])}
                      className={`grid size-11 place-items-center rounded-full text-[14px] font-semibold ${on ? 'bg-navy text-white' : 'bg-white text-ink'}`}
                    >
                      {weekdayName(wd, lang).slice(0, lang === 'ar' ? 3 : 2)}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[15px]">{t('filter.for')}</span>
                <Segmented
                  className="w-56"
                  label={t('filter.for')}
                  value={String(weeks)}
                  onChange={(v) => setWeeks(+v)}
                  options={[2, 4, 8].map((n) => [String(n), t('filter.n_weeks', { count: n })])}
                />
              </div>
            </div>
          )}

          {pattern === 'pick' && (
            <>
              <CalendarPicker
                spaceId={null}
                start={null}
                end={null}
                selected={picked}
                focus={picked[picked.length - 1]}
                onToggle={(d) => setPicked((p) => (p.includes(d) ? (p.length > 1 ? p.filter((x) => x !== d) : p) : [...p, d]))}
              />
              <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{t('filter.pick_hint')}</p>
            </>
          )}

          {pattern !== 'one' && (
            <p className="mt-2 px-1 text-[13px] text-grey-ink">
              {dates.length
                ? `${t('filter.n_days', { count: dates.length })}: ${dates.slice(0, 5).map(short).join(', ')}${dates.length > 5 ? ` +${dates.length - 5}` : ''}`
                : t('filter.no_days')}
            </p>
          )}
        </section>

        <Group label={step(2, single ? t('book.time') : t('filter.usual_time'))} footer={single ? null : t('filter.usual_time_hint')}>
          <GroupRow label={t('book.start')} htmlFor="fr-start">
            <RowSelect id="fr-start" value={st ?? ''} onChange={(e) => setStart(+e.target.value)}>
              {times.map((m) => (
                <option key={m} value={m}>
                  {hm(m)}
                </option>
              ))}
            </RowSelect>
          </GroupRow>
          <GroupRow label={t('filter.duration')} htmlFor="fr-dur">
            <RowSelect id="fr-dur" value={dur} onChange={(e) => setDur(+e.target.value)}>
              {[30, 60, 90, 120, 180].map((d) => (
                <option key={d} value={d}>
                  {t('filter.minutes', { count: d })}
                </option>
              ))}
            </RowSelect>
          </GroupRow>
        </Group>

        <section>
          <SectionLabel>{step(3, t('filter.size'))}</SectionLabel>
          <div className="flex gap-2">
            {['any', 'small', 'big'].map((k) => (
              <Chip key={k} active={size === k} onClick={() => setSize(k)}>
                {t(`filter.${k}`)}
              </Chip>
            ))}
          </div>
        </section>

        {single ? (
          <section aria-live="polite">
            <SectionLabel>{step(4, t('filter.pick_room'))}</SectionLabel>
            <p className="-mt-1 mb-2 px-1 text-[13px] text-grey-ink">{t('filter.results', { count: plan[0]?.options.length || 0 })}</p>
            {plan[0]?.clash ? (
              <p className="rounded-2xl bg-amber/15 px-4 py-3 text-[15px] text-[#7a4f00]">{t('filter.you_have_booking')}</p>
            ) : plan[0]?.options.length ? (
              <div className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
                {plan[0].options.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-semibold">{L(sp.label)}</span>
                      <span className="block text-[13px] text-grey-ink">
                        {t('map.people', { n: sp.capacity })} ·{' '}
                        <span dir="ltr">
                          {hm(plan[0].start)}–{hm(plan[0].end)}
                        </span>
                      </span>
                    </span>
                    <button
                      className="btn-secondary !min-h-10 shrink-0"
                      onClick={() => go([{ date: day, spaceId: sp.id, start: plan[0].start, end: plan[0].end }])}
                    >
                      {t('list.book')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              dates.length > 0 && <p className="rounded-2xl bg-surface px-4 py-3 text-grey-ink">{t('filter.none')}</p>
            )}
          </section>
        ) : (
          dates.length > 0 && (
            <section aria-live="polite">
              <SectionLabel>{step(4, t('filter.your_days'))}</SectionLabel>
              <p className="-mt-1 mb-2 px-1 text-[13px] text-grey-ink">{t('filter.your_days_hint')}</p>
              <ul className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
                {plan.map((p) => {
                  const starts = startsOn(p.date, 30)
                  const ends = []
                  if (p.start !== undefined) for (let m = p.start + 30; m <= hoursFor(data, p.date).close; m += 30) ends.push(m)
                  return (
                    <li key={p.date} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-semibold">{short(p.date)}</span>
                        {p.room ? (
                          <StatusChip status="free" label={t('filter.ready')} />
                        ) : (
                          <StatusChip status="awaiting_confirmation" label={p.clash ? t('filter.you_have_booking_short') : t('filter.no_room')} />
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-[auto_auto_1fr] items-center gap-2" dir="ltr">
                        <select
                          aria-label={`${short(p.date)} · ${t('book.start')}`}
                          className="min-h-10 rounded-lg bg-white px-2 text-[15px] tabular-nums"
                          value={p.start ?? ''}
                          onChange={(e) => {
                            const s = +e.target.value
                            change(p.date, { start: s, end: s + (p.end - p.start || dur) })
                          }}
                        >
                          {starts.map((m) => (
                            <option key={m} value={m}>
                              {hm(m)}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label={`${short(p.date)} · ${t('book.end')}`}
                          className="min-h-10 rounded-lg bg-white px-2 text-[15px] tabular-nums"
                          value={p.end ?? ''}
                          onChange={(e) => change(p.date, { end: +e.target.value })}
                        >
                          {ends.map((m) => (
                            <option key={m} value={m}>
                              {hm(m)}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label={`${short(p.date)} · ${t('book.room')}`}
                          className="min-h-10 min-w-0 rounded-lg bg-white px-2 text-[15px] disabled:text-grey-ink"
                          dir={lang === 'ar' ? 'rtl' : 'ltr'}
                          value={p.room?.id ?? ''}
                          disabled={!p.options.length || p.clash}
                          onChange={(e) => change(p.date, { spaceId: e.target.value })}
                        >
                          {!p.room && <option value="">{t('filter.no_room')}</option>}
                          {p.options.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {L(sp.label)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 space-y-2">
                <button
                  className="btn-primary w-full"
                  disabled={!ready.length}
                  onClick={() => go(ready.map((p) => ({ date: p.date, spaceId: p.room.id, start: p.start, end: p.end })))}
                >
                  {t('filter.review_n', { count: ready.length })}
                </button>
                <p className="text-center text-[13px] text-grey-ink">
                  {ready.length < plan.length
                    ? t('filter.some_skipped', { count: plan.length - ready.length })
                    : t('filter.rooms_used', { count: new Set(ready.map((p) => p.room.id)).size })}
                </p>
              </div>
            </section>
          )
        )}
      </div>
    </>
  )
}
