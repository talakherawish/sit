import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useRequireLogin } from '../lib/hooks'
import { dateOf, nextFreeAt, stateAt } from '../lib/logic'
import { hm } from '../lib/time'
import CalendarPicker, { DayStrip } from './Calendar'
import DayTimeline from './DayTimeline'
import { useWhen } from './Browse'
import { Sheet, Switch } from './ui'
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

/** Bottom sheet for anything tapped on the map or in the Rooms list: public seating or a bookable room. */
export default function RoomSheet({ id, onClose, onJump, day, range }) {
  if (!id) return null
  return id === 'public' ? (
    <PublicSheet onClose={onClose} />
  ) : (
    <BookableRoomSheet key={`${id}-${day}-${range?.start}`} id={id} onClose={onClose} onJump={onJump} initialDay={day} initialRange={range} />
  )
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
        <span className="flex items-baseline gap-1.5" dir="ltr">
          <span className="font-head text-[48px] leading-none font-bold tracking-tight">{taken}</span>
          <span className="font-head text-[22px] font-semibold text-grey-ink">/ {total}</span>
        </span>
        <span className="ms-auto pb-1 text-end text-[15px] leading-snug text-grey-ink">
          {t('home.seats_taken')}
          <br />
          <span className="font-semibold text-[#2f5656]">{t('home.seats_free', { count: total - taken })}</span>
        </span>
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

/** `initialDay` / `initialRange` preselect a day and time, e.g. when opened from a free slot in the Rooms day view. */
function BookableRoomSheet({ id, onClose, onJump, initialDay, initialRange }) {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const mode = useStore((s) => s.mode)
  const set = useStore((s) => s.set)
  const when = useWhen()
  const [day, setDay] = useState(initialDay || when.date)
  const [range, setRange] = useState(initialRange || null)
  const [multi, setMulti] = useState(false)
  const [dates, setDates] = useState([initialDay || when.date])

  const sp = data.spaces.find((s) => s.id === id)
  const meta = `${t('map.people', { n: sp.capacity })} · ${sp.size_m2} m² · ${sp.features.map((f) => t(`feature.${f}`)).join(' · ')}`
  const st = stateAt(data, id, when.date, when.min)

  if (st.state === 'down') {
    return (
      <Sheet
        open
        onClose={onClose}
        title={L(sp.label)}
        subtitle={meta}
        footer={
          <button className="btn-primary w-full" onClick={() => navigate('/r/list')}>
            {t('room.find_another')}
          </button>
        }
      >
        <div className="rounded-2xl bg-red/10 px-4 py-3.5">
          <p className="font-semibold text-[#a32f2f]">{t('room.down')}</p>
          <p className="mt-0.5 text-[15px]">{st.reason}</p>
        </div>
      </Sheet>
    )
  }

  const nf = st.state === 'booked' ? nextFreeAt(data, id, when.date, when.min) : null
  const others = st.state === 'booked' ? data.spaces.filter((s) => s.id !== id && stateAt(data, s.id, when.date, when.min).state === 'free') : []
  const toggleDay = (d) => {
    if (dates.includes(d)) {
      if (dates.length > 1) setDates(dates.filter((x) => x !== d))
    } else setDates([...dates, d].sort())
  }
  const book = () => {
    const modeObj = data.work_modes.find((m) => m.id === mode)
    const picked = multi ? dates : [day]
    set({ draft: { spaceId: id, date: picked[0], dates: picked, start: range?.start, end: range?.end, reason: modeObj?.default_reason || '', source: 'map' } })
    onClose()
    requireLogin('/r/book')
  }
  const n = multi ? dates.length : 1

  return (
    <Sheet
      open
      onClose={onClose}
      title={L(sp.label)}
      subtitle={meta}
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button className="btn-secondary px-5" onClick={() => navigate(`/r/room/${id}`)}>
            {t('room.details')}
          </button>
          <button className="btn-primary" onClick={book} disabled={!range}>
            {!range ? (
              t('room.pick_time')
            ) : n > 1 ? (
              t('room.book_days', { count: n })
            ) : (
              <span dir="ltr">{t('room.book_range', { from: hm(range.start), to: hm(range.end) })}</span>
            )}
          </button>
        </div>
      }
    >
      {st.state === 'booked' && when.date === dateOf(now) && (
        <div className="mb-5 rounded-2xl bg-surface px-4 py-3">
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

      <DayStrip
        value={day}
        onChange={(d) => {
          setDay(d)
          setRange(null)
        }}
      />
      <div className="mt-4">
        <DayTimeline spaceId={id} date={day} range={range} onChange={setRange} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl bg-surface">
        <div className="flex min-h-12 items-center gap-3 px-4">
          <Icon name="calendar" size={18} className="text-navy" />
          <span className="flex-1 text-[17px]">{t('room.more_days')}</span>
          <Switch
            checked={multi}
            onChange={(v) => {
              setMulti(v)
              setDates([day])
            }}
            label={t('room.more_days')}
          />
        </div>
      </div>
      {multi && (
        <div className="mt-3">
          <CalendarPicker spaceId={id} start={range?.start ?? null} end={range?.end ?? null} selected={dates} focus={day} onToggle={toggleDay} />
          <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{range ? t('room.more_days_hint') : t('room.more_days_pick_time')}</p>
        </div>
      )}
    </Sheet>
  )
}
