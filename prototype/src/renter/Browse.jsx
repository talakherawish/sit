import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useRequireLogin } from '../lib/hooks'
import { dateOf } from '../lib/logic'
import { fmtDate, hm, weekday, weekdayName } from '../lib/time'
import { AmenityList, AmenitySheet } from '../components/Amenities'
import BookingPlanner from '../components/BookingPlanner'
import RoomAvailability from '../components/RoomAvailability'
import { Card, ScreenTitle } from '../components/ui'
import { PhotoCarousel } from '../components/RoomPhoto'
import Icon from '../components/Icon'

/**
 * R-02 Book ahead: later days and repeating bookings, as one form (see BookingPlanner). Guests are
 * asked to log in when they confirm; the form keeps their choices meanwhile.
 */
export function BookAhead() {
  const { t } = useTranslation()
  const renterId = useStore((s) => s.renterId)
  const set = useStore((s) => s.set)
  return (
    <div className="pb-4">
      <ScreenTitle id="R-02" title={t('ahead.title')} />
      <BookingPlanner
        renterId={renterId}
        onNoRenter={() => set({ gate: { returnTo: '/r/list' } })}
        roomLink={(id) => (
          <Link to={`/r/room/${id}`} className="btn-link shrink-0 !text-[15px]">
            {t('ahead.details')}
            <Icon name="next" size={16} className="rtl:rotate-180" />
          </Link>
        )}
      />
    </div>
  )
}

/**
 * R-03 Room details: photos, what's in the room, and this room's availability: a month calendar where
 * only busy days get a dot (amber = under an hour left, grey = fully booked), and the
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
  const plan = useStore((s) => s.plan)
  const set = useStore((s) => s.set)
  const today = dateOf(now)
  const [day, setDay] = useState(today)
  const [range, setRange] = useState(null)
  const sp = data.spaces.find((s) => s.id === id)
  if (!sp) return <ScreenTitle id="R-03" title="—" back />

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
        <PhotoCarousel space={sp} />
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

        <div>
          <RoomAvailability
            id={id}
            day={day}
            onDay={(d) => {
              setDay(d)
              setRange(null)
            }}
            range={range}
            onRange={setRange}
          />
        </div>

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
