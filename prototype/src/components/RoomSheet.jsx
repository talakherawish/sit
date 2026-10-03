import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { dateOf, minOfDay, nextFreeAt, stateAt } from '../lib/logic'
import { hm } from '../lib/time'
import DayTimeline from './DayTimeline'
import RoomAvailability from './RoomAvailability'
import { PhotoCarousel } from './RoomPhoto'
import { Sheet } from './ui'
import Icon from './Icon'

/** Grouped list of house rules with check marks. */
export function RulesList({ rules }) {
  const L = useL()
  return (
    <ul className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
      {rules.map((r, k) => (
        <li key={k} className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-[16px] leading-snug">
          <Icon name="check" size={16} className="shrink-0 text-teal" />
          {L(r)}
        </li>
      ))}
    </ul>
  )
}

/**
 * Bottom sheet for public seating or a room tapped on Today: its photos and its day today, with the
 * room's calendar one tap away for other days.
 */
export default function RoomSheet({ id, onClose, onJump, onBook }) {
  if (!id) return null
  if (id === 'public') return <PublicSheet onClose={onClose} />
  return <TodayRoomSheet key={id} id={id} onClose={onClose} onJump={onJump} onBook={onBook} />
}

function PublicSheet({ onClose }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const z = data.zones.find((x) => x.type === 'public_seating')
  const last = data.seat_log[data.seat_log.length - 1]
  const { taken, total } = data.seats
  return (
    <Sheet open onClose={onClose} title={L(z.name)} subtitle={t('home.updated_ago', { count: Math.max(0, now - last.time) })}>
      <div className="mb-5 flex items-end gap-3 rounded-[22px] bg-surface px-5 py-4">
        <span className="font-head text-[48px] leading-none font-bold tracking-tight text-[#2f5656] tabular-nums">{total - taken}</span>
        <span className="pb-1 text-[17px] font-semibold text-[#2f5656]">{t('home.seats_free_word', { count: total - taken })}</span>
        <span className="ms-auto pb-1 text-end text-[15px] text-grey-ink">{t('home.seats_of', { taken, total })}</span>
      </div>
      <h3 className="mb-1.5 px-1 text-[15px] font-semibold">{t('home.zone_rules')}</h3>
      <RulesList rules={z.rules} />
      <p className="mt-4 flex gap-2 px-1 text-[15px] text-grey-ink">
        <Icon name="info" size={18} className="mt-0.5 shrink-0 text-navy" />
        {t('home.not_bookable')}
      </p>
    </Sheet>
  )
}

const roomMeta = (t, sp) => `${t('map.people', { n: sp.capacity })} · ${sp.size_m2} m² · ${sp.features.map((f) => t(`feature.${f}`)).join(' · ')}`

/**
 * From Today: the room's photos and its day today. Pick a time and Book hands it to Today's Confirm
 * booking bar. "Other days" quietly opens the room's month calendar in place; pick a later day and Book
 * carries the room, day and time into the Book ahead form.
 */
function TodayRoomSheet({ id, onClose, onJump, onBook }) {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const plan = useStore((s) => s.plan)
  const set = useStore((s) => s.set)
  const today = dateOf(now)
  const [range, setRange] = useState(null)
  const [calendar, setCalendar] = useState(false)
  const [day, setDay] = useState(today)
  const min = minOfDay(now)
  const sp = data.spaces.find((s) => s.id === id)
  const st = stateAt(data, id, today, min)
  const down = st.state === 'down'
  const nf = st.state === 'booked' ? nextFreeAt(data, id, today, min) : null
  const others = st.state === 'booked' ? data.spaces.filter((s) => s.id !== id && stateAt(data, s.id, today, min).state === 'free') : []

  const book = () => {
    if (day === today) return onBook({ spaceId: id, start: range.start, end: range.end })
    const p = plan || {}
    set({ plan: { ...p, room: id, dates: [day], start: range?.start ?? p.start ?? null, end: range?.end ?? p.end ?? null } })
    onClose()
    navigate('/r/list')
  }
  const toggleCalendar = () => {
    setCalendar(!calendar)
    setDay(today)
    setRange(null)
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={L(sp.label)}
      subtitle={roomMeta(t, sp)}
      footer={
        down ? (
          <button className="btn-primary w-full" onClick={onClose}>
            {t('room.find_another')}
          </button>
        ) : (
          <button className="btn-primary w-full" onClick={book} disabled={!range && day === today}>
            {range ? (
              <span dir="ltr">{t('room.book_range', { from: hm(range.start), to: hm(range.end) })}</span>
            ) : day === today ? (
              t('room.pick_time')
            ) : (
              t('details.book_room')
            )}
          </button>
        )
      }
    >
      <PhotoCarousel space={sp} className="mb-4" />

      {down && (
        <div className="mb-4 rounded-2xl bg-red/10 px-4 py-3.5">
          <p className="font-semibold text-[#a32f2f]">{t('room.down')}</p>
          <p className="mt-0.5 text-[15px]">{st.reason}</p>
        </div>
      )}
      {st.state === 'booked' && !calendar && (
        <div className="mb-4 rounded-2xl bg-surface px-4 py-3">
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <Icon name="lock" size={16} />
            {t('room.booked_until', { time: hm(st.booking.end) })}
            <span className="font-normal text-grey-ink">· {nf !== null ? t('room.next_free', { time: hm(nf) }) : t('room.no_free_today')}</span>
          </p>
          {others.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-grey-ink">{t('room.other_free')}</span>
              {others.map((o) => (
                <button key={o.id} onClick={() => onJump(o.id)} className="min-h-9 rounded-full bg-white px-3 text-[13px] font-medium text-navy">
                  {L(o.label)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Today's day, with a quiet way into the room's calendar */}
      <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
        <h3 className="text-[15px] font-semibold">{!calendar && t('room.today')}</h3>
        <button
          onClick={toggleCalendar}
          className="-me-2 flex min-h-9 items-center gap-1 rounded-full px-2 text-[13px] font-medium text-navy"
          aria-expanded={calendar}
        >
          <Icon name="calendar" size={15} />
          {calendar ? t('room.today_only') : t('room.other_days')}
        </button>
      </div>
      {calendar ? (
        <div className="animate-fade">
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
      ) : (
        <DayTimeline spaceId={id} date={today} range={range} onChange={setRange} />
      )}
    </Sheet>
  )
}
