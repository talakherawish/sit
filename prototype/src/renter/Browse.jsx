import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useRequireLogin } from '../lib/hooks'
import { hoursFor, isFree, stateAt, nextFreeAt, dateOf, minOfDay } from '../lib/logic'
import { addDays, fmtDate, hm, weekday, weekdayName, ceil30 } from '../lib/time'
import { AmenityList, AmenitySheet } from '../components/Amenities'
import CalendarPicker, { DayStrip } from '../components/Calendar'
import { WhenBar, useWhen } from '../components/Browse'
import RoomSheet from '../components/RoomSheet'
import DayTimeline from '../components/DayTimeline'
import { Card, Chip, Group, GroupRow, PhaseBadge, Photo, RowSelect, ScreenTitle, SectionLabel, Segmented, StatusChip } from '../components/ui'
import Icon from '../components/Icon'

/** R-02 Rooms: the same rooms as the map, as a list. Tapping one opens the same booking sheet. */
export function SpacesList() {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const when = useWhen()
  const [open, setOpen] = useState(null)
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
        <p className="-mt-1 px-5 text-[15px] text-grey-ink">{t('list.intro')}</p>
        <div className="mt-3">
          <WhenBar />
        </div>
      </div>

      {groups.map(([kind, title]) => (
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

      {amenity ? <AmenitySheet id={open} onClose={() => setOpen(null)} /> : <RoomSheet id={open} onClose={() => setOpen(null)} onJump={setOpen} />}
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

/** R-05 Find a room: one day, a weekly or monthly pattern, or any days you pick; results update as you go. */
export function FilterRooms() {
  const { t } = useTranslation()
  const L = useL()
  const requireLogin = useRequireLogin()
  const lang = useStore((s) => s.lang)
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const mode = useStore((s) => s.mode)
  const set = useStore((s) => s.set)
  const today = dateOf(now)
  const firstOpen = Array.from({ length: 14 }, (_, i) => addDays(today, i)).find((d) => hoursFor(data, d))
  const openWeekdays = data.opening_hours.filter((o) => o.open !== null && o.open !== false).map((o) => o.weekday)

  const [pattern, setPattern] = useState('one') // one | weekly | monthly | pick
  const [day, setDay] = useState(firstOpen)
  const [weekdays, setWeekdays] = useState([weekday(firstOpen)])
  const [weeks, setWeeks] = useState(4)
  const [dom, setDom] = useState(Number(firstOpen.slice(8)))
  const [months, setMonths] = useState(3)
  const [picked, setPicked] = useState([firstOpen])
  const [start, setStart] = useState(null)
  const [dur, setDur] = useState(60)
  const [size, setSize] = useState('any')

  const dates = (() => {
    if (pattern === 'one') return [day]
    if (pattern === 'pick') return [...picked].sort()
    const out = []
    if (pattern === 'weekly') {
      for (let i = 0; i < weeks * 7; i++) {
        const d = addDays(today, i)
        if (weekdays.includes(weekday(d)) && hoursFor(data, d)) out.push(d)
      }
    } else {
      const [y, m] = today.split('-').map(Number)
      for (let i = 0; i < months; i++) {
        const dt = new Date(Date.UTC(y, m - 1 + i, dom))
        if (dt.getUTCDate() !== dom) continue // e.g. the 31st in a 30-day month
        const d = dt.toISOString().slice(0, 10)
        if (d >= today && hoursFor(data, d)) out.push(d)
      }
    }
    return out
  })()

  const first = dates[0]
  const h = first && hoursFor(data, first)
  const times = []
  if (h) for (let m = h.open; m + dur <= h.close; m += 30) if (first !== today || m >= ceil30(minOfDay(now))) times.push(m)
  const st = times.includes(start) ? start : times[0]
  const rooms = data.spaces
    .filter((sp) => size === 'any' || (size === 'small' ? sp.kind === 'focus_room' : sp.kind === 'big_room'))
    .map((sp) => ({ sp, free: st === undefined ? [] : dates.filter((d) => isFree(data, sp.id, d, st, st + dur)) }))
    .filter((r) => r.free.length)
    .sort((a, b) => b.free.length - a.free.length)

  const book = ({ sp, free }) => {
    const reason = data.work_modes.find((m) => m.id === mode)?.default_reason || ''
    set({ draft: { spaceId: sp.id, date: free[0], dates: free, start: st, end: st + dur, reason, source: 'filter' } })
    requireLogin('/r/book')
  }
  const short = (d) => fmtDate(d, lang, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <>
      <ScreenTitle id="R-05" title={t('filter.title')} phase="next" back />
      <div className="space-y-6 px-4 pb-4">
        <section>
          <SectionLabel>{t('filter.days')}</SectionLabel>
          <Segmented
            className="mb-3"
            label={t('filter.days')}
            value={pattern}
            onChange={setPattern}
            options={[
              ['one', t('filter.p_one')],
              ['weekly', t('filter.p_weekly')],
              ['monthly', t('filter.p_monthly')],
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

          {pattern === 'monthly' && (
            <div className="space-y-3 rounded-2xl bg-surface p-4">
              <label className="flex items-center justify-between gap-3">
                <span className="text-[15px]">{t('filter.on_day')}</span>
                <select className="min-h-11 rounded-xl bg-white px-3 text-[17px]" value={dom} onChange={(e) => setDom(+e.target.value)}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[15px]">{t('filter.for')}</span>
                <Segmented
                  className="w-56"
                  label={t('filter.for')}
                  value={String(months)}
                  onChange={(v) => setMonths(+v)}
                  options={[2, 3, 6].map((n) => [String(n), t('filter.n_months', { count: n })])}
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
                onToggle={(d) => setPicked(picked.includes(d) ? (picked.length > 1 ? picked.filter((x) => x !== d) : picked) : [...picked, d])}
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

        <Group label={t('book.time')}>
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
          <SectionLabel>{t('filter.size')}</SectionLabel>
          <div className="flex gap-2">
            {['any', 'small', 'big'].map((k) => (
              <Chip key={k} active={size === k} onClick={() => setSize(k)}>
                {t(`filter.${k}`)}
              </Chip>
            ))}
          </div>
        </section>

        <section aria-live="polite">
          <SectionLabel>{dates.length ? t('filter.results', { count: rooms.length }) : t('filter.no_days')}</SectionLabel>
          {rooms.length ? (
            <div className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
              {rooms.map((r) => {
                const all = r.free.length === dates.length
                return (
                  <div key={r.sp.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-semibold">{L(r.sp.label)}</span>
                      <span className={`block text-[13px] ${all ? 'font-medium text-[#2f5656]' : 'text-[#7a4f00]'}`}>
                        {dates.length === 1
                          ? `${t('map.people', { n: r.sp.capacity })} · ${hm(st)}–${hm(st + dur)}`
                          : all
                            ? t('filter.free_all', { count: dates.length })
                            : t('filter.free_some', { free: r.free.length, total: dates.length })}
                      </span>
                    </span>
                    <button className="btn-secondary !min-h-10 shrink-0" onClick={() => book(r)}>
                      {r.free.length > 1 ? t('room.book_days', { count: r.free.length }) : t('list.book')}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            dates.length > 0 && <p className="rounded-2xl bg-surface px-4 py-3 text-grey-ink">{t('filter.none')}</p>
          )}
        </section>
      </div>
    </>
  )
}
