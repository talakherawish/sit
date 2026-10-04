import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useReportBooking, useSpaceName, useTemplate } from '../lib/hooks'
import { ACTIVE, endAbs, freeStarts, hoursFor, startAbs, dateOf, minOfDay, renter as findRenter } from '../lib/logic'
import { addDays, fmtDate, hm } from '../lib/time'
import { Chip, Confirm, Empty, ScreenTitle, StatusChip } from '../components/ui'
import Icon from '../components/Icon'
import MonthGrid from '../components/MonthGrid'
import { NeedLogin } from './RenterLayout'

// Filter chips: any mix of the four kinds, plus Most recent (newest bookings first). None = everything.
const KIND = {
  awaiting: ['awaiting_confirmation'],
  confirmed: ['confirmed'],
  attended: ['checked_in', 'used'],
  cancelled: ['cancelled', 'cancelled_by_staff', 'released'],
}
const FILTERS = ['awaiting', 'confirmed', 'attended', 'cancelled', 'recent']
// The coloured edge down the start of a card, one per status
const EDGE = {
  awaiting_confirmation: 'before:bg-amber',
  confirmed: 'before:bg-teal',
  checked_in: 'before:bg-navy',
  used: 'before:bg-navy',
}

/**
 * R-13 My bookings: cards or a month calendar. Cards are filtered with quiet chips (no Upcoming / Past
 * switch): with none picked you see what's coming up, soonest first, then what's past. A repeating booking
 * is one card that opens to show every date in it.
 */
export function MyBookings() {
  const { t } = useTranslation()
  const s = useStore()
  const view = s.bookingsView || 'cards'
  const [filters, setFilters] = useState([])
  const [cancel, setCancel] = useState(null)
  const [whole, setWhole] = useState(false)
  const [open, setOpen] = useState({}) // series cards opened
  const me = findRenter(s.data, s.renterId)
  if (!me) return <NeedLogin returnTo="/r/bookings" />

  const mine = s.data.bookings.filter((b) => b.renter_id === me.id)
  const kinds = filters.filter((f) => f !== 'recent')
  const recent = filters.includes('recent')
  const shown = kinds.length ? mine.filter((b) => kinds.some((k) => KIND[k].includes(b.status))) : mine
  const toggle = (f) => setFilters((on) => (on.includes(f) ? on.filter((x) => x !== f) : [...on, f]))

  // Most recent = newest bookings first, in one list. Otherwise: coming up (soonest first), then past (latest first).
  const sections = recent
    ? [{ key: 'recent', list: [...shown].sort((a, b) => b.created_at - a.created_at) }]
    : [
        { key: 'upcoming', list: shown.filter((b) => endAbs(b) > s.now).sort((a, b) => startAbs(a) - startAbs(b)) },
        { key: 'past', list: shown.filter((b) => endAbs(b) <= s.now).sort((a, b) => startAbs(b) - startAbs(a)) },
      ].filter((x) => x.list.length)
  // A repeating booking becomes one card, where its first date would be.
  const cardsOf = (list) => {
    const out = []
    const series = {}
    for (const b of list) {
      if (!b.series_id) out.push({ key: b.id, one: b })
      else if (series[b.series_id]) series[b.series_id].push(b)
      else out.push({ key: b.series_id, many: (series[b.series_id] = [b]) })
    }
    return out.map((c) => (c.many?.length === 1 ? { key: c.key, one: c.many[0] } : c))
  }

  const doCancel = () => {
    s.cancelWithUndo(cancel.id, whole)
    setCancel(null)
    setWhole(false)
  }
  const card = (b) => <BookingCard key={b.id} b={b} onCancel={setCancel} />

  return (
    <>
      <ScreenTitle id="R-13" title={t('bookings.title')}>
        <ViewSwitch value={view} onChange={(v) => s.set({ bookingsView: v })} />
      </ScreenTitle>
      <div className="px-4">
        {view === 'calendar' ? (
          <BookingsCalendar bookings={mine} render={card} />
        ) : (
          <>
            <div className="fade-x no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4" role="group" aria-label={t('bookings.filters')}>
              {FILTERS.map((f) => {
                const on = filters.includes(f)
                return (
                  <button
                    key={f}
                    onClick={() => toggle(f)}
                    aria-pressed={on}
                    className={`flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-medium transition-colors ${
                      on ? 'bg-ink text-white' : 'text-grey-ink ring-1 ring-black/[0.1] ring-inset active:bg-black/[0.04]'
                    }`}
                  >
                    {on && <Icon name="check" size={13} className="stroke-[3]" />}
                    {t(`bookings.filter_${f}`)}
                  </button>
                )
              })}
            </div>
            {!sections.length && <Empty>{filters.length ? t('bookings.none_filtered') : t('bookings.none_upcoming')}</Empty>}
            {sections.map((sec) => (
              <section key={sec.key} className="mb-6">
                {sec.key !== 'recent' && (
                  <h2 className="mb-2 px-1 text-[13px] font-semibold text-grey-ink">
                    {t(`bookings.${sec.key}`)} · {cardsOf(sec.list).length}
                  </h2>
                )}
                <div className="space-y-2.5">
                  {cardsOf(sec.list).map((c) =>
                    c.one ? (
                      card(c.one)
                    ) : (
                      <SeriesCard
                        key={c.key}
                        list={c.many}
                        open={!!open[c.key]}
                        onToggle={() => setOpen({ ...open, [c.key]: !open[c.key] })}
                        onCancel={setCancel}
                      />
                    ),
                  )}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
      <Confirm
        open={!!cancel}
        title={t('bookings.cancel_title')}
        body={t('bookings.cancel_body')}
        okLabel={t('bookings.cancel_ok')}
        danger
        onOk={doCancel}
        onCancel={() => {
          setCancel(null)
          setWhole(false)
        }}
      >
        {cancel?.series_id && (
          <fieldset className="mt-3 space-y-1">
            {[
              [false, t('bookings.this_one')],
              [true, t('bookings.whole_series')],
            ].map(([v, l]) => (
              <label key={String(v)} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="scope" className="size-5 accent-navy" checked={whole === v} onChange={() => setWhole(v)} />
                {l}
              </label>
            ))}
          </fieldset>
        )}
      </Confirm>
    </>
  )
}

/** What a booking's status is right now, and the one short line that goes with it. */
function useBookingState() {
  const { t } = useTranslation()
  const now = useStore((s) => s.now)
  return (b) => {
    const isPast = endAbs(b) <= now
    const started = now >= startAbs(b)
    const inRoom = b.status === 'used' || b.status === 'checked_in'
    const active = ACTIVE.includes(b.status)
    const canEdit = active && !started && !inRoom
    const waiting = b.status === 'awaiting_confirmation' && !started
    const status = inRoom && !isPast ? 'checked_in' : b.status
    const label = inRoom && !isPast ? t('bookings.in_room', { time: hm(b.end) }) : undefined
    // Only what you have to do, and by when: unconfirmed bookings go 1 h before, unclaimed ones 15 min after
    const note = waiting
      ? t('bookings.confirm_by', { time: hm(Math.max(0, b.start - 60)) })
      : b.status === 'confirmed' && !started
        ? t('bookings.checkin_by', { time: hm(b.start + 15) })
        : null
    return { isPast, started, inRoom, active, canEdit, waiting, status, label, note }
  }
}

const pill = 'min-h-9 shrink-0 rounded-full px-3.5 text-[15px] active:opacity-80'

/** The actions under a booking: Confirm · Change · Cancel before it starts; Report a problem once it has. */
function Actions({ b, st, onCancel }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const s = useStore()
  const report = useReportBooking()
  if (st.canEdit && !st.isPast)
    return (
      <div className="mt-3 flex gap-2">
        {st.waiting && (
          <button
            className={`${pill} bg-navy font-semibold text-white`}
            onClick={() => {
              s.confirmBooking(b.id)
              s.showToast('toast.confirmed')
            }}
          >
            {t('bookings.confirm')}
          </button>
        )}
        <button className={`${pill} bg-black/[0.05] font-medium text-ink`} onClick={() => navigate(`/r/bookings/${b.id}/move`)}>
          {t('bookings.change')}
        </button>
        <button className={`${pill} bg-black/[0.05] font-medium text-[#c23b3b]`} onClick={() => onCancel(b)}>
          {t('bookings.cancel')}
        </button>
      </div>
    )
  // Once it has started (or you're in the room), Change / Cancel give way to Report a problem
  if ((!st.isPast && st.active) || (st.isPast && b.status === 'used'))
    return (
      <div className="mt-3 flex gap-2">
        <button className={`${pill} flex items-center gap-1.5 bg-red/10 font-medium text-[#c23b3b]`} onClick={() => report(b)}>
          <Icon name="flag" size={16} />
          {t('account.report')}
        </button>
        {st.isPast && <AgainButton b={b} />}
      </div>
    )
  if (b.status === 'cancelled_by_staff' && !st.isPast)
    return (
      <Link to="/r/list" className={`${pill} mt-3 inline-flex items-center bg-black/[0.05] font-medium text-navy`}>
        {t('notif.book_another')}
      </Link>
    )
  if (st.isPast)
    return (
      <div className="mt-3">
        <AgainButton b={b} />
      </div>
    )
  return null
}

function AgainButton({ b }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const set = useStore((s) => s.set)
  return (
    <button
      className={`${pill} bg-black/[0.05] font-medium text-navy`}
      onClick={() => {
        set({ draft: { spaceId: b.space_id, reason: b.reason, reasonOther: b.reason_other, source: 'rebook' } })
        navigate('/r/book')
      }}
    >
      {t('bookings.again')}
    </button>
  )
}

/**
 * One booking, laid out the same whatever its status: room and status on top, then the time large with the
 * date on the far side, then one short line (confirm by / check in by) and the actions.
 */
function BookingCard({ b, onCancel }) {
  const lang = useStore((s) => s.lang)
  const name = useSpaceName()
  const st = useBookingState()(b)
  const gone = !ACTIVE.includes(b.status)
  return (
    <article
      className={`relative overflow-hidden rounded-[20px] bg-surface p-4 ps-5 before:absolute before:inset-y-0 before:start-0 before:w-1 ${EDGE[b.status] || 'before:bg-grey/40'}`}
    >
      <Link to={`/r/confirmed/${b.id}`} className="-m-1 block rounded-xl p-1 active:bg-black/[0.04]">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 truncate text-[15px] font-semibold">{name(b.space_id)}</h3>
          <StatusChip status={st.status} label={st.label} />
        </div>
        <div className={`mt-1 flex items-baseline justify-between gap-3 ${gone ? 'text-grey-ink' : ''}`}>
          <span dir="ltr" className={`font-head text-[24px] leading-tight font-bold tracking-tight tabular-nums ${gone ? 'line-through decoration-1' : ''}`}>
            {hm(b.start)}–{hm(b.end)}
          </span>
          <span className="shrink-0 text-[15px] font-medium text-grey-ink">{fmtDate(b.date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
        {st.note && <p className="mt-0.5 text-[13px] text-grey-ink">{st.note}</p>}
      </Link>
      <Actions b={b} st={st} onCancel={onCancel} />
    </article>
  )
}

/**
 * A repeating booking as one card: room, the time large and the days it repeats on, then its first and
 * last date. Opening it lists every date, each with its status, Confirm when it's waiting, and a tap for details.
 */
function SeriesCard({ list, open, onToggle, onCancel }) {
  const { t } = useTranslation()
  const s = useStore()
  const name = useSpaceName()
  const state = useBookingState()
  const first = list[0]
  const last = list[list.length - 1]
  const short = (d) => fmtDate(d, s.lang, { weekday: 'short', day: 'numeric', month: 'short' })
  const dow = (b) => new Date(`${b.date}T00:00`).getDay()
  const days = [...new Set(list.map(dow))]
    .sort()
    .map((d) => fmtDate(list.find((b) => dow(b) === d).date, s.lang, { weekday: 'short' }))
    .join(' · ')
  const waiting = list.filter((b) => state(b).waiting).length
  const sameTime = list.every((b) => b.start === first.start && b.end === first.end)
  return (
    <article
      className={`relative overflow-hidden rounded-[20px] bg-surface before:absolute before:inset-y-0 before:start-0 before:w-1 ${EDGE[waiting ? 'awaiting_confirmation' : first.status] || 'before:bg-grey/40'}`}
    >
      <button onClick={onToggle} aria-expanded={open} className="block w-full p-4 ps-5 text-start active:bg-black/[0.03]">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 truncate text-[15px] font-semibold">{name(first.space_id)}</h3>
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-navy">
            <Icon name="repeat" size={13} />
            {t('bookings.dates', { count: list.length })}
          </span>
          {waiting > 0 && <StatusChip status="awaiting_confirmation" label={t('bookings.waiting', { count: waiting })} />}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span dir="ltr" className="font-head text-[24px] leading-tight font-bold tracking-tight tabular-nums">
            {hm(first.start)}–{hm(first.end)}
            {!sameTime && '…'}
          </span>
          <span className="shrink-0 text-[15px] font-medium text-grey-ink">{t('bookings.every', { days })}</span>
        </div>
        <p className="mt-0.5 flex items-center justify-between gap-2 text-[13px] text-grey-ink">
          <span className="truncate">
            {short(first.date)} – {short(last.date)}
          </span>
          <span className="flex shrink-0 items-center gap-0.5 font-medium text-navy">
            {open ? t('bookings.hide') : t('bookings.show_all')}
            <Icon name="next" size={14} className={`transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
          </span>
        </p>
      </button>
      {open && (
        <ul className="animate-fade ms-5 me-4 mb-2 divide-y divide-black/[0.06] border-t border-black/[0.06]">
          {list.map((b) => {
            const st = state(b)
            return (
              <li key={b.id} className="flex min-h-12 items-center gap-2 py-1">
                <Link to={`/r/confirmed/${b.id}`} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-60">
                  <span className="w-[96px] shrink-0 text-[15px] font-medium">{short(b.date)}</span>
                  {!sameTime && (
                    <span dir="ltr" className="shrink-0 text-[13px] text-grey-ink tabular-nums">
                      {hm(b.start)}
                    </span>
                  )}
                  {/* A waiting date says so with its Confirm button */}
                  {!st.waiting && <StatusChip status={st.status} label={st.label} />}
                </Link>
                {st.waiting ? (
                  <button
                    className="min-h-8 shrink-0 rounded-full bg-navy px-3 text-[13px] font-semibold text-white active:opacity-80"
                    onClick={() => {
                      s.confirmBooking(b.id)
                      s.showToast('toast.confirmed')
                    }}
                  >
                    {t('bookings.confirm')}
                  </button>
                ) : (
                  st.canEdit && (
                    <button
                      className="min-h-8 shrink-0 rounded-full px-2 text-[13px] font-medium text-[#c23b3b] active:bg-black/[0.05]"
                      onClick={() => onCancel(b)}
                    >
                      {t('bookings.cancel')}
                    </button>
                  )
                )}
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}

/** Cards ⇄ Calendar, as two icon buttons beside the title. */
function ViewSwitch({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="mb-1 flex rounded-[10px] bg-[#EBEBEF] p-[2px]" role="group" aria-label={t('bookings.view')}>
      {[
        ['cards', 'list'],
        ['calendar', 'calendar'],
      ].map(([v, icon]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          aria-label={t(`bookings.view_${v}`)}
          title={t(`bookings.view_${v}`)}
          className={`grid size-9 place-items-center rounded-[8px] transition ${value === v ? 'bg-white text-ink shadow-[0_2px_6px_rgba(0,0,0,0.1)]' : 'text-grey-ink'}`}
        >
          <Icon name={icon} size={18} />
        </button>
      ))}
    </div>
  )
}

const DOT = { awaiting_confirmation: 'bg-amber', confirmed: 'bg-navy', checked_in: 'bg-navy', used: 'bg-navy' }

/**
 * Month calendar of your bookings: a dot per booking (amber = waiting for you to confirm, navy =
 * confirmed or used, grey = cancelled or released). Tap a day to see its bookings underneath.
 */
function BookingsCalendar({ bookings, render }) {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const now = useStore((s) => s.now)
  const today = dateOf(now)
  const byDay = {}
  for (const b of bookings) (byDay[b.date] ||= []).push(b)
  for (const d in byDay) byDay[d].sort((a, b) => a.start - b.start)
  const nextDay = Object.keys(byDay)
    .filter((d) => d >= today && byDay[d].some((b) => endAbs(b) > now))
    .sort()[0]
  const [day, setDay] = useState(nextDay || today)
  const list = byDay[day] || []

  return (
    <div>
      <MonthGrid
        value={day}
        onPick={setDay}
        dots={(d) => (byDay[d] || []).slice(0, 3).map((b) => DOT[b.status] || 'bg-grey/40')}
        describe={(d) => (byDay[d] ? t('bookings.count', { count: byDay[d].length }) : '')}
      />
      <h2 className="mt-5 mb-1.5 px-1 text-[15px] font-semibold">{fmtDate(day, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      <div className="space-y-3">{list.length ? list.map(render) : <Empty>{t('bookings.none_day')}</Empty>}</div>
    </div>
  )
}

/** R-14 Move booking */
export function MoveBooking() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const name = useSpaceName()
  const s = useStore()
  const b = s.data.bookings.find((x) => x.id === id)
  const [date, setDate] = useState(b?.date)
  const [start, setStart] = useState(null)
  if (!b) return <ScreenTitle id="R-14" title={t('move.title')} back />
  const dur = b.end - b.start
  const days = Array.from({ length: 14 }, (_, i) => addDays(dateOf(s.now), i)).filter((d) => hoursFor(s.data, d))
  const slots = freeStarts(s.data, b.space_id, date, s.now, dur, b.id).filter((m) => !(date === b.date && m === b.start))
  const save = () => {
    s.moveBooking(b.id, date, start, start + dur)
    s.showToast('toast.moved')
    navigate('/r/bookings', { replace: true })
  }
  return (
    <>
      <ScreenTitle id="R-14" title={t('move.title')} back />
      <div className="space-y-4 px-4">
        <p className="rounded-2xl bg-surface p-4">
          {name(b.space_id)} · {fmtDate(b.date, s.lang)} ·{' '}
          <span dir="ltr">
            {hm(b.start)}–{hm(b.end)}
          </span>
        </p>
        <div>
          <p className="mb-1 text-sm font-semibold">{t('book.date')}</p>
          <div className="fade-x no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {days.map((d) => (
              <Chip
                key={d}
                active={d === date}
                onClick={() => {
                  setDate(d)
                  setStart(null)
                }}
              >
                {fmtDate(d, s.lang)}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">{t('move.free_only', { count: dur })}</p>
          <div className="flex flex-wrap gap-2">
            {slots.length ? (
              slots.map((m) => (
                <Chip key={m} active={start === m} onClick={() => setStart(m)}>
                  <span dir="ltr">
                    {hm(m)}–{hm(m + dur)}
                  </span>
                </Chip>
              ))
            ) : (
              <p className="text-grey-ink">{t('room.no_free_today')}</p>
            )}
          </div>
        </div>
        <button className="btn-primary w-full" disabled={start === null} onClick={save}>
          {t('move.save')}
        </button>
      </div>
    </>
  )
}

/** R-15 Reminder message, rendered as an SMS preview */
export function Reminder() {
  const { id } = useParams()
  const { t } = useTranslation()
  const tpl = useTemplate()
  const s = useStore()
  const b = s.data.bookings.find((x) => x.id === id)
  if (!b) return <ScreenTitle id="R-15" title={t('reminder_screen.title')} back />
  const waiting = b.status === 'awaiting_confirmation'
  return (
    <>
      <ScreenTitle id="R-15" title={t('reminder_screen.title')} back />
      <div className="space-y-4 px-4">
        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-2 text-center text-xs text-grey-ink">SMS · Sit{b.reminder_at !== null && ` · ${hm(minOfDay(b.reminder_at))}`}</p>
          <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-surface p-3">
            {tpl('reminder', { spaceId: b.space_id, time: hm(b.start), date: b.date })}
          </div>
          {waiting ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="btn-danger"
                onClick={() => {
                  s.cancelWithUndo(b.id)
                }}
              >
                {t('reminder_screen.cancel')}
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  s.confirmBooking(b.id)
                  s.showToast('toast.confirmed')
                }}
              >
                {t('reminder_screen.confirm')}
              </button>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2">
              {t('bookings.status')}: <StatusChip status={b.status} />
            </p>
          )}
        </div>
        <div className="rounded-lg bg-amber/10 p-3 text-sm">
          <p className="mb-1 flex items-center gap-1 font-semibold">
            <Icon name="info" size={18} />
            {t('reminder_screen.rules')}
          </p>
          <ul className="list-disc space-y-1 ps-5">
            <li>{t('reminder_screen.rule1')}</li>
            <li>{t('reminder_screen.rule2')}</li>
            <li>{t('reminder_screen.rule3')}</li>
          </ul>
        </div>
        <Link to="/r/bookings" className="btn-secondary w-full">
          {t('confirmed.my_bookings')}
        </Link>
      </div>
    </>
  )
}
