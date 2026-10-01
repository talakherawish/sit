import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useRequireLogin } from '../lib/hooks'
import { freeStarts, hoursFor, isFree, stateAt, nextFreeAt, dateOf, minOfDay } from '../lib/logic'
import { addDays, fmtDate, hm, weekday, weekdayName, ceil30 } from '../lib/time'
import { MapListSwitch, ModeChips, WhenBar, useWhen } from '../components/Browse'
import { Card, Chip, Field, PhaseBadge, Photo, ScreenTitle, StatusChip } from '../components/ui'
import Icon from '../components/Icon'

/** R-02 Spaces list */
export function SpacesList() {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  const data = useStore((s) => s.data)
  const mode = useStore((s) => s.mode)
  const set = useStore((s) => s.set)
  const when = useWhen()
  const hl = data.work_modes.find((m) => m.id === mode)?.highlight_zone_types || []
  const zt = (zid) => data.zones.find((z) => z.id === zid).type
  const pub = data.zones.find((z) => z.type === 'public_seating')
  const book = (sp) => {
    const st = when.min
    const start = isFree(data, sp.id, when.date, ceil30(st), ceil30(st) + 30) ? ceil30(st) : undefined
    set({ draft: { spaceId: sp.id, date: when.date, start, reason: data.work_modes.find((m) => m.id === mode)?.default_reason || '', source: 'list' } })
    requireLogin('/r/book')
  }
  const groups = [
    ['focus_room', t('list.focus_rooms')],
    ['big_room', t('list.big_rooms')],
  ]
  return (
    <div className="space-y-4">
      <ScreenTitle id="R-02" title={t('list.title')} />
      <ModeChips />
      <WhenBar />
      <div className="px-4">
        <div className="mb-3 flex justify-end">
          <MapListSwitch active="list" />
        </div>
        <Card className={hl.includes('public_seating') ? 'ring-2 ring-orange' : ''}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{L(pub.name)}</span>
            <span className="rounded-full bg-orange px-2.5 font-head text-[18px] font-bold text-white">
              {data.seats.taken}/{data.seats.total}
            </span>
          </div>
          <p className="text-sm text-grey-ink">{t('home.not_bookable')}</p>
        </Card>
        {groups.map(([kind, title]) => (
          <section key={kind} className="mt-4">
            <h2 className="mb-2 font-head text-xl font-bold">{title}</h2>
            <div className="space-y-2">
              {data.spaces
                .filter((s) => s.kind === kind)
                .map((sp) => {
                  const st = stateAt(data, sp.id, when.date, when.min)
                  const nf = nextFreeAt(data, sp.id, when.date, when.min)
                  const match = hl.includes(zt(sp.zone_id))
                  const dim = mode !== 'browse' && !match
                  return (
                    <div key={sp.id} className={`rounded-lg bg-white ring-1 ${match ? 'ring-2 ring-orange' : 'ring-grey/20'} ${dim ? 'opacity-60' : ''}`}>
                      <Link to={`/r/room/${sp.id}`} className="block p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{L(sp.label)}</span>
                          {st.state === 'free' ? (
                            <StatusChip status="free" label={when.isNow ? t('list.free_now') : t('legend.free')} />
                          ) : st.state === 'down' ? (
                            <StatusChip status="down" label={t('map.down')} />
                          ) : (
                            <StatusChip status="booked" label={nf !== null ? t('list.free_from', { time: hm(nf) }) : t('map.booked')} />
                          )}
                        </div>
                        <p className="text-sm text-grey-ink">
                          {t('map.people', { n: sp.capacity })} · {sp.features.map((f) => t(`feature.${f}`)).join(' · ')}
                        </p>
                      </Link>
                      <div className="flex gap-2 border-t border-grey/15 p-2">
                        <button
                          className="btn-secondary flex-1"
                          onClick={() => {
                            set({ selected: sp.id })
                            navigate('/r/home')
                          }}
                        >
                          <Icon name="map" size={18} />
                          {t('list.show_on_map')}
                        </button>
                        <button className="btn-primary flex-1" onClick={() => book(sp)} disabled={st.state === 'down'}>
                          {t('list.book')}
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </section>
        ))}
      </div>
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
  const sp = data.spaces.find((s) => s.id === id)
  if (!sp) return <ScreenTitle id="R-03" title="—" back />
  const date = dateOf(now)
  const slots = freeStarts(data, id, date, now, 30)
  const book = (start) => {
    set({
      draft: {
        spaceId: id,
        date,
        start,
        end: start !== undefined ? (isFree(data, id, date, start, start + 60) ? start + 60 : start + 30) : undefined,
        source: 'details',
      },
    })
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
          <h2 className="mb-2 font-semibold">{t('details.free_today')}</h2>
          <div className="flex flex-wrap gap-2">
            {slots.length ? (
              slots.map((m) => (
                <Chip key={m} onClick={() => book(m)}>
                  {hm(m)}
                </Chip>
              ))
            ) : (
              <p className="text-grey-ink">{t('room.no_free_today')}</p>
            )}
          </div>
        </section>
        <button className="btn-primary w-full" onClick={() => book(slots[0])}>
          {t('details.book')}
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
  return (
    <>
      <ScreenTitle id="R-04" title={t('hours.title')} back />
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
          <h2 className="mb-2 font-head text-xl font-bold">{t('hours.closed_days')}</h2>
          <ul className="space-y-2">
            {data.closed_days.map((c) => (
              <li key={c.date} className="flex justify-between rounded-lg bg-white p-3 ring-1 ring-grey/20">
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

/** R-05 Filter rooms (#27, Next) */
export function FilterRooms() {
  const { t } = useTranslation()
  const L = useL()
  const lang = useStore((s) => s.lang)
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const days = Array.from({ length: 14 }, (_, i) => addDays(dateOf(now), i)).filter((d) => hoursFor(data, d))
  const [date, setDate] = useState(days[0])
  const [start, setStart] = useState(ceil30(minOfDay(now)))
  const [dur, setDur] = useState(60)
  const [size, setSize] = useState('any')
  const [shown, setShown] = useState(false)
  const h = hoursFor(data, date)
  const times = []
  if (h) for (let m = h.open; m < h.close; m += 30) if (date !== dateOf(now) || m >= ceil30(minOfDay(now))) times.push(m)
  const st = times.includes(start) ? start : times[0]
  const results = data.spaces.filter(
    (sp) =>
      (size === 'any' || (size === 'small' ? sp.kind === 'focus_room' : sp.kind === 'big_room')) && st !== undefined && isFree(data, sp.id, date, st, st + dur),
  )
  return (
    <>
      <ScreenTitle id="R-05" title={t('filter.title')} phase="next" back />
      <div className="space-y-4 px-4">
        <Field label={t('book.date')}>
          <select
            className="input"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setShown(false)
            }}
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {fmtDate(d, lang)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('book.start')}>
            <select
              className="input"
              value={st}
              onChange={(e) => {
                setStart(+e.target.value)
                setShown(false)
              }}
            >
              {times.map((m) => (
                <option key={m} value={m}>
                  {hm(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('filter.duration')}>
            <select
              className="input"
              value={dur}
              onChange={(e) => {
                setDur(+e.target.value)
                setShown(false)
              }}
            >
              {[30, 60, 90, 120, 180].map((d) => (
                <option key={d} value={d}>
                  {t('filter.minutes', { count: d })}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">{t('filter.size')}</legend>
          <div className="flex gap-2">
            {['small', 'big', 'any'].map((k) => (
              <Chip
                key={k}
                active={size === k}
                onClick={() => {
                  setSize(k)
                  setShown(false)
                }}
              >
                {t(`filter.${k}`)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <button className="btn-primary w-full" onClick={() => setShown(true)}>
          {t('filter.show')}
        </button>
        {shown && (
          <section aria-live="polite">
            <h2 className="mb-2 font-semibold">{t('filter.results', { count: results.length })}</h2>
            <div className="space-y-2">
              {results.map((sp) => (
                <Link key={sp.id} to={`/r/room/${sp.id}`} className="flex min-h-12 items-center justify-between rounded-lg bg-white p-3 ring-1 ring-grey/20">
                  <span>
                    <span className="font-semibold">{L(sp.label)}</span> · {t('map.people', { n: sp.capacity })}
                  </span>
                  <span className="text-sm" dir="ltr">
                    {hm(st)}–{hm(st + dur)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
