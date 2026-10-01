import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useSpaceName, useTemplate } from '../lib/hooks'
import { ACTIVE, endAbs, freeStarts, hoursFor, startAbs, dateOf, minOfDay, renter as findRenter } from '../lib/logic'
import { addDays, fmtDate, hm } from '../lib/time'
import { Chip, Confirm, Empty, PhaseBadge, ScreenTitle, StatusChip } from '../components/ui'
import Icon from '../components/Icon'
import { NeedLogin } from './RenterLayout'

/** R-13 My bookings */
export function MyBookings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const s = useStore()
  const [tab, setTab] = useState('upcoming')
  const [cancel, setCancel] = useState(null)
  const [whole, setWhole] = useState(false)
  const [expanded, setExpanded] = useState({})
  const name = useSpaceName()
  const me = findRenter(s.data, s.renterId)
  if (!me) return <NeedLogin returnTo="/r/bookings" />

  const mine = s.data.bookings.filter((b) => b.renter_id === me.id)
  const upcoming = mine.filter((b) => endAbs(b) > s.now).sort((a, b) => startAbs(a) - startAbs(b))
  const past = mine.filter((b) => endAbs(b) <= s.now).sort((a, b) => startAbs(b) - startAbs(a))

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

  const doCancel = () => {
    s.cancelBooking(cancel.id, whole)
    s.showToast('toast.cancel_email')
    setCancel(null)
    setWhole(false)
  }
  const again = (b) => {
    s.set({ draft: { spaceId: b.space_id, reason: b.reason, reasonOther: b.reason_other, source: 'rebook' } })
    navigate('/r/book')
  }

  return (
    <>
      <ScreenTitle id="R-13" title={t('bookings.title')} />
      <div className="px-4">
        <div className="mb-3 grid grid-cols-2 rounded-lg bg-white p-1 ring-1 ring-grey/20" role="tablist">
          {['upcoming', 'past'].map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`min-h-10 rounded-md font-semibold ${tab === k ? 'bg-navy text-white' : 'text-navy'}`}
            >
              {t(`bookings.${k}`)}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {!rows.length && <Empty>{tab === 'upcoming' ? t('bookings.none_upcoming') : t('bookings.none_past')}</Empty>}
          {rows.map((b) => {
            const started = s.now >= startAbs(b)
            const active = ACTIVE.includes(b.status)
            const canEdit = active && !started && b.status !== 'used'
            return (
              <article key={b.id} className="rounded-lg bg-white p-3 ring-1 ring-grey/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{name(b.space_id)}</h2>
                    <p className="text-sm">
                      {fmtDate(b.date, s.lang)} ·{' '}
                      <span dir="ltr">
                        {hm(b.start)}–{hm(b.end)}
                      </span>
                    </p>
                    <p className="text-sm text-grey-ink">{b.reason === 'other' ? b.reason_other : t(`reason.${b.reason}`)}</p>
                  </div>
                  <StatusChip status={b.status} />
                </div>
                {b.series_id && tab === 'upcoming' && (
                  <p className="mt-1 text-sm">
                    <span className="font-medium">{t('bookings.series')}</span> <PhaseBadge phase="next" />
                    {more(b.series_id) > 0 && !expanded[b.series_id] && (
                      <button className="btn-link ms-2 !min-h-0" onClick={() => setExpanded({ ...expanded, [b.series_id]: true })}>
                        {t('bookings.more', { count: more(b.series_id) })}
                      </button>
                    )}
                  </p>
                )}
                {tab === 'upcoming' && active && (
                  <>
                    {b.status === 'awaiting_confirmation' && b.reminder_sent && (
                      <Link to={`/r/reminder/${b.id}`} className="btn-link">
                        {t('bookings.confirm_now')}
                      </Link>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button className="btn-secondary flex-1" disabled={!canEdit} onClick={() => navigate(`/r/bookings/${b.id}/move`)}>
                        {t('bookings.change')}
                      </button>
                      <button className="btn-danger flex-1" disabled={!canEdit} onClick={() => setCancel(b)}>
                        {t('bookings.cancel')}
                      </button>
                    </div>
                    {started && <p className="mt-1 text-sm text-grey-ink">{t('bookings.started')}</p>}
                  </>
                )}
                {b.status === 'cancelled_by_staff' && tab === 'upcoming' && (
                  <Link to="/r/filter" className="btn-link">
                    {t('notif.book_another')}
                  </Link>
                )}
                {tab === 'past' && (
                  <button className="btn-link" onClick={() => again(b)}>
                    {t('bookings.again')}
                  </button>
                )}
              </article>
            )
          })}
        </div>
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
                <input type="radio" name="scope" className="size-5 accent-orange" checked={whole === v} onChange={() => setWhole(v)} />
                {l}
              </label>
            ))}
          </fieldset>
        )}
      </Confirm>
    </>
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
        <p className="rounded-lg bg-white p-3 ring-1 ring-grey/20">
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
        <div className="rounded-2xl bg-white p-4 ring-1 ring-grey/20">
          <p className="mb-2 text-center text-xs text-grey-ink">SMS · Sit{b.reminder_at !== null && ` · ${hm(minOfDay(b.reminder_at))}`}</p>
          <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-surface p-3">
            {tpl('reminder', { spaceId: b.space_id, time: hm(b.start), date: b.date })}
          </div>
          {waiting ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="btn-danger"
                onClick={() => {
                  s.cancelBooking(b.id)
                  s.showToast('toast.cancel_email')
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
