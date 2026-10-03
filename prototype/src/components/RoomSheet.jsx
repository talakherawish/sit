import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useRequireLogin } from '../lib/hooks'
import { dateOf, expandDates, minOfDay, nextFreeAt, stateAt } from '../lib/logic'
import { fmtDate, hm } from '../lib/time'
import CalendarPicker from './Calendar'
import DayTimeline from './DayTimeline'
import RepeatPicker from './Repeat'
import { SectionLabel, Sheet } from './ui'
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
 * Bottom sheet for anything tapped on Today or in Book ahead: public seating or a bookable room.
 * `todayOnly` (from Today) shows just today's free times; otherwise it's for planning: pick days on a
 * month calendar, a time, and how long to repeat.
 */
export default function RoomSheet({ id, onClose, onJump, todayOnly }) {
  if (!id) return null
  if (id === 'public') return <PublicSheet onClose={onClose} />
  return todayOnly ? <TodayRoomSheet key={id} id={id} onClose={onClose} onJump={onJump} /> : <PlanRoomSheet key={id} id={id} onClose={onClose} />
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

/** From Today: the room's free times today only. Tap a time, then Book goes to Review. */
function TodayRoomSheet({ id, onClose, onJump }) {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const set = useStore((s) => s.set)
  const [range, setRange] = useState(null)
  const today = dateOf(now)
  const min = minOfDay(now)
  const sp = data.spaces.find((s) => s.id === id)
  const st = stateAt(data, id, today, min)

  if (st.state === 'down') {
    return (
      <Sheet
        open
        onClose={onClose}
        title={L(sp.label)}
        subtitle={roomMeta(t, sp)}
        footer={
          <button className="btn-primary w-full" onClick={onClose}>
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

  const nf = st.state === 'booked' ? nextFreeAt(data, id, today, min) : null
  const others = st.state === 'booked' ? data.spaces.filter((s) => s.id !== id && stateAt(data, s.id, today, min).state === 'free') : []
  const book = () => {
    set({ draft: { spaceId: id, date: today, dates: [today], start: range.start, end: range.end, source: 'today' } })
    onClose()
    requireLogin('/r/book')
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={L(sp.label)}
      subtitle={roomMeta(t, sp)}
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button className="btn-secondary px-5" onClick={() => navigate(`/r/room/${id}`)}>
            {t('room.details')}
          </button>
          <button className="btn-primary" onClick={book} disabled={!range}>
            {!range ? t('room.pick_time') : <span dir="ltr">{t('room.book_range', { from: hm(range.start), to: hm(range.end) })}</span>}
          </button>
        </div>
      }
    >
      {st.state === 'booked' && (
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
      <DayTimeline spaceId={id} date={today} range={range} onChange={setRange} />
      <button
        className="btn-link mx-auto mt-3 flex"
        onClick={() => {
          onClose()
          navigate('/r/list')
        }}
      >
        <Icon name="calendar" size={18} />
        {t('room.another_day')}
      </button>
    </Sheet>
  )
}

/**
 * From Book ahead (By room): pick days on a month calendar, a time on one of them, and how long to
 * repeat. Teal dots on the calendar show the days the room is free at that time.
 */
function PlanRoomSheet({ id, onClose }) {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  const data = useStore((s) => s.data)
  const lang = useStore((s) => s.lang)
  const plan = useStore((s) => s.plan)
  const set = useStore((s) => s.set)
  const [dates, setDates] = useState([])
  const [focus, setFocus] = useState(null)
  const [range, setRange] = useState(null)
  const [rep, setRep] = useState({ repeat: 'none', until: null })
  const sp = data.spaces.find((s) => s.id === id)
  const sorted = [...dates].sort()
  const { dates: all, closed } = expandDates(data, sorted, rep.repeat, rep.until)

  const toggle = (d) => {
    if (dates.includes(d)) {
      const rest = dates.filter((x) => x !== d)
      setDates(rest)
      if (focus === d) setFocus([...rest].sort()[0] || null)
    } else {
      setDates([...dates, d])
      setFocus(d)
    }
  }
  const book = () => {
    const items = all.map((date) => ({ date, spaceId: id, start: range.start, end: range.end }))
    set({ draft: { spaceId: id, date: all[0], dates: all, start: range.start, end: range.end, items, reason: plan?.reason || '', source: 'room' } })
    onClose()
    requireLogin('/r/book')
  }
  const ready = !!range && all.length > 0

  return (
    <Sheet
      open
      onClose={onClose}
      title={L(sp.label)}
      subtitle={roomMeta(t, sp)}
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button className="btn-secondary px-5" onClick={() => navigate(`/r/room/${id}`)}>
            {t('room.details')}
          </button>
          <button className="btn-primary" onClick={book} disabled={!ready}>
            {!dates.length ? t('ahead.pick_days') : !range ? t('room.pick_time') : t('ahead.book_n', { count: all.length })}
          </button>
        </div>
      }
    >
      <section>
        <CalendarPicker monthOnly spaceId={id} start={range?.start ?? null} end={range?.end ?? null} selected={dates} focus={focus} onToggle={toggle} />
        <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{!dates.length ? t('ahead.tap_days') : range ? t('room.more_days_hint') : t('room.more_days_pick_time')}</p>
      </section>

      {focus && (
        <section className="mt-6">
          <SectionLabel>{t('ahead.times_on', { date: fmtDate(focus, lang, { weekday: 'long', day: 'numeric', month: 'short' }) })}</SectionLabel>
          <DayTimeline spaceId={id} date={focus} range={range} onChange={setRange} />
        </section>
      )}

      <div className="mt-6">
        <RepeatPicker repeat={rep.repeat} until={rep.until} first={sorted[0]} onChange={setRep} />
        {all.length > 0 && (
          <p className="mt-1 px-1 text-[13px] font-medium text-ink">
            {t('ahead.n_dates', { count: all.length })}
            {closed.length > 0 && <span className="font-normal text-grey-ink"> · {t('ahead.closed_skipped', { count: closed.length })}</span>}
          </p>
        )}
      </div>
    </Sheet>
  )
}
