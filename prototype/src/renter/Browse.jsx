import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useRequireLogin } from '../lib/hooks'
import { stateAt, nextFreeAt, dateOf } from '../lib/logic'
import { fmtDate, hm, weekday, weekdayName } from '../lib/time'
import { AmenityList, AmenitySheet } from '../components/Amenities'
import { DayStrip } from '../components/Calendar'
import { WhenBar, useWhen } from '../components/Browse'
import RoomSheet from '../components/RoomSheet'
import DayTimeline from '../components/DayTimeline'
import RoomsCalendar from '../components/RoomsCalendar'
import { Card, Photo, ScreenTitle, SectionLabel, Segmented, StatusChip } from '../components/ui'
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
