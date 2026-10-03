import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useReasonText, useReportBooking, useSpaceName, useTemplate } from '../lib/hooks'
import { ACTIVE, endAbs, freeStarts, hoursFor, startAbs, dateOf, minOfDay, renter as findRenter } from '../lib/logic'
import { addDays, addMonths, fmtDate, hm, weekday } from '../lib/time'
import { Chip, Confirm, Empty, ScreenTitle, Segmented, StatusChip } from '../components/ui'
import Icon from '../components/Icon'
import { NeedLogin } from './RenterLayout'

/** R-13 My bookings: as cards (Upcoming / Past) or as a month calendar. */
export function MyBookings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const s = useStore()
  const view = s.bookingsView || 'cards'
  const [tab, setTab] = useState('upcoming')
  const [sort, setSort] = useState('soonest') // soonest | latest | booked
  const [cancel, setCancel] = useState(null)
  const [whole, setWhole] = useState(false)
  const [expanded, setExpanded] = useState({})
  const name = useSpaceName()
  const reasonText = useReasonText()
  const report = useReportBooking()
  const me = findRenter(s.data, s.renterId)
  if (!me) return <NeedLogin returnTo="/r/bookings" />

  const mine = s.data.bookings.filter((b) => b.renter_id === me.id)
  const order = {
    soonest: (a, b) => startAbs(a) - startAbs(b),
    latest: (a, b) => startAbs(b) - startAbs(a),
    booked: (a, b) => b.created_at - a.created_at,
  }
  // "Soonest" on Past means the most recent visit first.
  const by = tab === 'past' ? { soonest: order.latest, latest: order.soonest, booked: order.booked }[sort] : order[sort]
  const upcoming = mine.filter((b) => endAbs(b) > s.now).sort(by)
  const past = mine.filter((b) => endAbs(b) <= s.now).sort(by)

  // Collapse recurring series to their next booking (+ "N more").
  const seen = {}
  const rows = []
  for (const b of tab === 'upcoming' ? upcoming : past) {
    if (tab === 'upcoming' && b.series_id) {
      seen[b.series_id] = (seen[b.series_id] || 0) + 1
      if (seen[b.series_id] > 1 && !expanded[b.series_id]) continue
    }
    rows.push(b)
  }
  const more = (sid) => upcoming.filter((b) => b.series_id === sid).length - 1
  // A repeating booking counts once.
  const count =
    tab === 'upcoming' ? upcoming.filter((b) => !b.series_id).length + new Set(upcoming.filter((b) => b.series_id).map((b) => b.series_id)).size : past.length

  const doCancel = () => {
    s.cancelWithUndo(cancel.id, whole)
    setCancel(null)
    setWhole(false)
  }
  const again = (b) => {
    s.set({ draft: { spaceId: b.space_id, reason: b.reason, reasonOther: b.reason_other, source: 'rebook' } })
    navigate('/r/book')
  }

  /** One booking card. `grouped` adds "+N more" for a repeating booking (cards view, Upcoming). */
  const card = (b, grouped) => {
    const isPast = endAbs(b) <= s.now
    const started = s.now >= startAbs(b)
    const active = ACTIVE.includes(b.status)
    const inRoom = b.status === 'used' || b.status === 'checked_in'
    const canEdit = active && !started && !inRoom
    const waiting = b.status === 'awaiting_confirmation' && !started
    return (
      <article key={b.id} className="rounded-2xl bg-surface p-4">
        <Link to={`/r/confirmed/${b.id}`} className="-m-1 flex items-start justify-between gap-2 rounded-xl p-1 active:bg-black/[0.04]">
          <div>
            <h2 className="text-[17px] font-semibold">{name(b.space_id)}</h2>
            <p className="text-sm">
              {fmtDate(b.date, s.lang)} ·{' '}
              <span dir="ltr" className="whitespace-nowrap">
                {hm(b.start)}–{hm(b.end)}
              </span>
            </p>
            {b.reason && <p className="text-sm text-grey-ink">{reasonText(b)}</p>}
          </div>
          <StatusChip status={inRoom && !isPast ? 'checked_in' : b.status} label={inRoom && !isPast ? t('bookings.in_room', { time: hm(b.end) }) : undefined} />
        </Link>
        {b.series_id && !isPast && (
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Icon name="repeat" size={14} className="text-grey-ink" />
            <span className="font-medium">{t('bookings.series')}</span>
            {grouped && more(b.series_id) > 0 && !expanded[b.series_id] && (
              <button className="btn-link ms-1 !min-h-0" onClick={() => setExpanded({ ...expanded, [b.series_id]: true })}>
                {t('bookings.more', { count: more(b.series_id) })}
              </button>
            )}
          </p>
        )}
        {!isPast && canEdit && (
          <>
            {waiting && <p className="mt-2 text-[13px] text-grey-ink">{t('bookings.confirm_hint')}</p>}
            <div className="mt-3 flex gap-2">
              {waiting && (
                <button
                  className="btn-secondary flex-1 !bg-navy !text-white"
                  onClick={() => {
                    s.confirmBooking(b.id)
                    s.showToast('toast.confirmed')
                  }}
                >
                  {t('bookings.confirm')}
                </button>
              )}
              <button className="btn-secondary flex-1" onClick={() => navigate(`/r/bookings/${b.id}/move`)}>
                {t('bookings.change')}
              </button>
              <button className="btn-danger flex-1" onClick={() => setCancel(b)}>
                {t('bookings.cancel')}
              </button>
            </div>
          </>
        )}
        {/* Once it has started (or you're in the room), Change / Cancel give way to Report a problem */}
        {((!isPast && active && !canEdit) || (isPast && b.status === 'used')) && (
          <button className="btn-danger mt-3 w-full" onClick={() => report(b)}>
            <Icon name="flag" size={18} />
            {t('account.report')}
          </button>
        )}
        {b.status === 'cancelled_by_staff' && !isPast && (
          <Link to="/r/list" className="btn-link">
            {t('notif.book_another')}
          </Link>
        )}
        {isPast && (
          <button className="btn-link" onClick={() => again(b)}>
            {t('bookings.again')}
          </button>
        )}
      </article>
    )
  }

  return (
    <>
      <ScreenTitle id="R-13" title={t('bookings.title')}>
        <ViewSwitch value={view} onChange={(v) => s.set({ bookingsView: v })} />
      </ScreenTitle>
      <div className="px-4">
        {view === 'calendar' ? (
          <BookingsCalendar bookings={mine} render={(b) => card(b, false)} />
        ) : (
          <>
            <Segmented
              className="mb-3"
              label={t('bookings.title')}
              value={tab}
              onChange={setTab}
              options={[
                ['upcoming', t('bookings.upcoming')],
                ['past', t('bookings.past')],
              ]}
            />
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-[13px] text-grey-ink">{t('bookings.count', { count })}</span>
              <label className="relative flex min-h-11 items-center gap-1 text-[15px] font-medium text-navy">
                <span className="sr-only">{t('bookings.sort')}</span>
                <Icon name="chevrons" size={16} />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none bg-transparent pe-1 font-medium text-navy outline-none"
                >
                  {['soonest', 'latest', 'booked'].map((k) => (
                    <option key={k} value={k}>
                      {t(`bookings.sort_${tab === 'past' ? { soonest: 'newest', latest: 'oldest', booked: 'booked' }[k] : k}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="space-y-3">
              {!rows.length && <Empty>{tab === 'upcoming' ? t('bookings.none_upcoming') : t('bookings.none_past')}</Empty>}
              {rows.map((b) => card(b, tab === 'upcoming'))}
            </div>
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
  const [cursor, setCursor] = useState(`${(nextDay || today).slice(0, 8)}01`)

  const first = addDays(cursor, -weekday(cursor)) // weeks start on Sunday
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i))
  const list = byDay[day] || []

  return (
    <div>
      <div className="rounded-2xl bg-surface p-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate px-1 text-[17px] font-semibold">{fmtDate(cursor, lang, { month: 'long', year: 'numeric' })}</span>
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="grid size-9 place-items-center rounded-full text-navy"
            aria-label={t('cal.prev')}
          >
            <Icon name="back" size={18} className="rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="grid size-9 place-items-center rounded-full text-navy"
            aria-label={t('cal.next')}
          >
            <Icon name="next" size={18} className="rtl:rotate-180" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[12px] font-medium text-grey-ink" aria-hidden="true">
          {days.slice(0, 7).map((d) => (
            <span key={d} className="pb-1">
              {fmtDate(d, lang, { weekday: lang === 'ar' ? 'short' : 'narrow' })}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((d) => {
            const items = byDay[d] || []
            const on = d === day
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                aria-pressed={on}
                aria-label={`${fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' })}${items.length ? ` — ${t('bookings.count', { count: items.length })}` : ''}`}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl ${d.slice(0, 7) !== cursor.slice(0, 7) ? 'opacity-40' : ''}`}
              >
                <span
                  className={`grid size-9 place-items-center rounded-full text-[16px] ${
                    on ? 'bg-navy font-semibold text-white' : d === today ? 'font-bold text-teal' : 'text-ink'
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                  {items.slice(0, 3).map((b) => (
                    <span key={b.id} className={`size-1.5 rounded-full ${DOT[b.status] || 'bg-grey/40'}`} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

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
