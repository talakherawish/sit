import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, usePersonName, useReasonText, useReportBooking, useSpaceName } from '../lib/hooks'
import { ACTIVE, REASONS, REMINDERS, endAbs, freeStarts, hoursFor, isFree, reminderAt, startAbs, renter as findRenter } from '../lib/logic'
import { fmtDate, fmtAbs, hm } from '../lib/time'
import BookingForm from '../components/BookingForm'
import { Chip, Confirm, Group, GroupRow, Photo, ScreenTitle, SectionLabel, StatusChip } from '../components/ui'
import { useDuration } from '../components/DayTimeline'
import Icon from '../components/Icon'
import { NeedLogin } from './RenterLayout'

/** R-06 Book a room. With a room and time already picked it is a one-screen review; otherwise the full form. */
export function Book() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const s = useStore()
  const pn = usePersonName()
  const me = findRenter(s.data, s.renterId)
  if (!me) return <NeedLogin returnTo="/r/book" />

  const submit = (f) => {
    const source = s.draft?.source || 'list'
    if (useStore.getState().justTaken) {
      const first = f.items?.[0] || f
      s.stealSlot(first)
      s.set({ draft: { spaceId: first.spaceId, date: first.date, start: first.start, end: first.end, reason: f.reason, source } })
      return navigate('/r/taken')
    }
    const { ids, skipped, clashes } = s.createBooking({ ...f, renterId: me.id }, { source })
    if (!ids.length && clashes) return s.showToast('toast.err_nothing_booked', { name: pn(me, true) })
    s.set({ draft: null })
    if (!ids.length) return navigate('/r/taken')
    navigate(`/r/confirmed/${ids[0]}`, { replace: true, state: { fresh: true } })
    // Undo takes the booking(s) straight back.
    s.showToast(skipped ? 'toast.series_skipped' : 'toast.booked', { count: skipped }, () => {
      useStore.getState().removeBookings(ids)
      navigate('/r/home', { replace: true })
    })
  }

  const d = s.draft
  const quick = d?.spaceId && d.start != null && d.end != null
  return (
    <>
      <ScreenTitle id="R-06" title={quick ? t('review.title') : t('book.title')} back />
      <div className="px-4">
        {quick ? (
          <QuickReview draft={d} onSubmit={submit} onEdit={() => navigate(-1)} />
        ) : (
          <BookingForm key={JSON.stringify(d)} renterId={me.id} initial={d || {}} onSubmit={submit} reasonOptional />
        )}
      </div>
    </>
  )
}

/** Short path: everything already chosen on the room sheet is shown as a summary; only the purpose is asked. */
function QuickReview({ draft, onSubmit, onEdit }) {
  const { t } = useTranslation()
  const L = useL()
  const dur = useDuration()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const lang = useStore((s) => s.lang)
  const [reason, setReason] = useState(draft.reason || '')
  // Asked once: if "What are you here to do?" was already answered (Book ahead), just show the answer.
  const [editReason, setEditReason] = useState(!draft.reason || draft.reason === 'other')
  const [other, setOther] = useState('')
  const [reminder, setReminder] = useState(null)
  const renterId = useStore((s) => s.renterId)
  // One item per day; days from Find a room can each have their own room and time.
  const items = (
    draft.items?.length
      ? draft.items
      : [...new Set(draft.dates?.length ? draft.dates : [draft.date])].map((date) => ({ date, spaceId: draft.spaceId, start: draft.start, end: draft.end }))
  )
    .filter((it) => hoursFor(data, it.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  // Skip days the room is taken, or you already have another booking at that time.
  const mine = (it) =>
    data.bookings.some((b) => b.renter_id === renterId && b.date === it.date && ACTIVE.includes(b.status) && b.start < it.end && it.start < b.end)
  const ok = (it) => isFree(data, it.spaceId, it.date, it.start, it.end) && !mine(it)
  const freeItems = items.filter(ok)
  const skipped = items.filter((it) => !ok(it)).map((it) => it.date)
  const free = freeItems.map((it) => it.date)
  const head = freeItems[0] || items[0]
  const sp = data.spaces.find((x) => x.id === head.spaceId)
  const uniform = freeItems.every((it) => it.spaceId === head.spaceId && it.start === head.start && it.end === head.end)
  const remOpts = freeItems.length ? REMINDERS.map((k) => ({ k, at: reminderAt(head.date, head.start, k) })).filter((o) => o.at > now) : []
  // The reason is optional; "Other" only needs words if picked.
  const valid = freeItems.length > 0 && (reason !== 'other' || other.trim())
  const [showAll, setShowAll] = useState(false)
  const FEW = 6
  const send = (e) => {
    e.preventDefault()
    if (!valid) return
    onSubmit({ ...head, items: freeItems, dates: free, reason, reasonOther: other.trim(), reminder, repeat: null })
  }
  const short = (x) => fmtDate(x, lang, { weekday: 'short', day: 'numeric', month: 'short' })
  const skippedNote = skipped.length > 0 && (
    <p className="bg-amber/15 px-4 py-2.5 text-[13px] text-[#7a4f00]">
      {t('review.skipped', { days: skipped.map((x) => fmtDate(x, lang, { weekday: 'short', day: 'numeric' })).join(', ') })}
    </p>
  )

  return (
    <form onSubmit={send} className="space-y-6 pb-4">
      {!uniform ? (
        <section className="overflow-hidden rounded-[22px] bg-surface">
          <p className="px-4 pt-4 pb-2 text-[19px] font-semibold">
            {t('review.n_days_rooms', { days: freeItems.length, rooms: new Set(freeItems.map((it) => it.spaceId)).size })}
          </p>
          <ul className="divide-y divide-black/[0.07] border-t border-black/[0.07]">
            {freeItems.map((it) => (
              <li key={it.date} className="flex min-h-12 items-center gap-3 px-4 py-2 text-[15px]">
                <span className="w-24 shrink-0 font-medium">{short(it.date)}</span>
                <span className="min-w-0 flex-1 truncate">{L(data.spaces.find((x) => x.id === it.spaceId).label)}</span>
                <span className="shrink-0 tabular-nums" dir="ltr">
                  {hm(it.start)}–{hm(it.end)}
                </span>
              </li>
            ))}
          </ul>
          {skippedNote}
        </section>
      ) : (
        <section className="overflow-hidden rounded-[22px] bg-surface">
          <div className="flex items-center gap-3 p-4">
            <Photo color={sp.photos[0]} className="!w-20 shrink-0 !rounded-xl" label={L(sp.label)} />
            <div>
              <p className="text-[19px] font-semibold">{L(sp.label)}</p>
              <p className="text-[13px] text-grey-ink">
                {t('map.people', { n: sp.capacity })} · {sp.features.map((f) => t(`feature.${f}`)).join(' · ')}
              </p>
            </div>
          </div>
          <div className="divide-y divide-black/[0.07] border-t border-black/[0.07]">
            <div className="flex min-h-12 items-center gap-3 px-4">
              <Icon name="clock" size={18} className="text-navy" />
              <span className="flex-1 text-[17px] font-semibold" dir="ltr">
                {hm(head.start)}–{hm(head.end)}
              </span>
              <span className="text-[15px] text-grey-ink">{dur(head.end - head.start)}</span>
            </div>
            <div className="flex items-start gap-3 px-4 py-3">
              <Icon name={free.length > 1 ? 'repeat' : 'calendar'} size={18} className="mt-1 text-navy" />
              <div className="min-w-0 flex-1">
                {free.length > FEW && (
                  <p className="mb-2 text-[15px] font-semibold">
                    {t('review.n_dates_range', { count: free.length, from: short(free[0]), to: short(free[free.length - 1]) })}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {(showAll || free.length <= FEW ? free : free.slice(0, 4)).map((x) => (
                    <span key={x} className="rounded-full bg-white px-3 py-1 text-[15px] font-medium">
                      {short(x)}
                    </span>
                  ))}
                  {free.length > FEW && (
                    <button type="button" className="min-h-8 rounded-full px-3 text-[15px] font-medium text-navy" onClick={() => setShowAll(!showAll)}>
                      {showAll ? t('review.show_less') : t('bookings.more', { count: free.length - 4 })}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {skippedNote}
          </div>
        </section>
      )}

      {!editReason ? (
        <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface px-4">
          <span className="text-[15px] text-grey-ink">{t('review.purpose')}</span>
          <span className="min-w-0 flex-1 truncate text-end text-[17px] font-medium">{t(`reason.${reason}`)}</span>
          <button type="button" className="min-h-11 shrink-0 px-1 text-[15px] font-medium text-navy" onClick={() => setEditReason(true)}>
            {t('common.edit')}
          </button>
        </div>
      ) : (
        <section>
          <SectionLabel>
            {t('review.purpose')} <span className="font-normal text-grey-ink">· {t('review.optional')}</span>
          </SectionLabel>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <Chip key={r} active={reason === r} onClick={() => setReason(reason === r ? '' : r)}>
                {t(`reason.${r}`)}
              </Chip>
            ))}
          </div>
          {reason === 'other' && (
            <input
              className="input mt-2"
              aria-label={t('book.reason_other')}
              placeholder={t('book.reason_other')}
              value={other}
              maxLength={80}
              onChange={(e) => setOther(e.target.value)}
              autoFocus
            />
          )}
        </section>
      )}

      <section>
        <SectionLabel>{t('book.reminder')}</SectionLabel>
        {remOpts.length ? (
          <div className="flex flex-wrap gap-2">
            {remOpts.map((o) => (
              <Chip key={o.k} active={reminder === o.k} onClick={() => setReminder(reminder === o.k ? null : o.k)}>
                {t(`reminder.${o.k}`)}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-surface px-4 py-3 text-[15px]">{t('book.no_reminder')}</p>
        )}
        {/* Only when there's a reminder to confirm from; a booking starting soon is confirmed straight away */}
        {remOpts.length > 0 && <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{t('book.reminder_hint')}</p>}
      </section>

      <div className="space-y-2">
        <button type="submit" className="btn-primary w-full" disabled={!valid}>
          {free.length > 1 ? t('review.confirm_n', { count: free.length }) : t('review.confirm')}
        </button>
        <button type="button" className="btn-link mx-auto flex" onClick={onEdit}>
          {t('review.edit')}
        </button>
      </div>
    </form>
  )
}

/** R-07 Slot just taken */
export function SlotTaken() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const draft = useStore((s) => s.draft)
  const set = useStore((s) => s.set)
  if (!draft?.spaceId) return <ScreenTitle id="R-07" title={t('taken.title')} back />
  const dur = draft.end - draft.start
  const same = freeStarts(data, draft.spaceId, draft.date, now, dur)
    .sort((a, b) => Math.abs(a - draft.start) - Math.abs(b - draft.start))
    .slice(0, 3)
    .sort((a, b) => a - b)
  const others = data.spaces.filter((sp) => sp.id !== draft.spaceId && isFree(data, sp.id, draft.date, draft.start, draft.end)).slice(0, 2)
  const pick = (patch) => {
    set({ draft: { ...draft, ...patch } })
    navigate('/r/book', { replace: true })
  }
  const room = data.spaces.find((s) => s.id === draft.spaceId)
  return (
    <>
      <ScreenTitle id="R-07" title={t('taken.title')} />
      <div className="space-y-4 px-4">
        <p className="rounded-lg bg-red/10 p-3 font-medium">{t('taken.body', { room: L(room.label), time: `${hm(draft.start)}–${hm(draft.end)}` })}</p>
        <section>
          <h2 className="mb-2 font-semibold">{t('taken.same_room', { room: L(room.label) })}</h2>
          <div className="grid gap-2">
            {same.length ? (
              same.map((m) => (
                <button
                  key={m}
                  onClick={() => pick({ start: m, end: m + dur })}
                  className="flex min-h-12 items-center justify-between rounded-2xl bg-surface px-4"
                >
                  <span dir="ltr" className="font-semibold">
                    {hm(m)}–{hm(m + dur)}
                  </span>
                  <Icon name="next" size={18} className="rtl:rotate-180" />
                </button>
              ))
            ) : (
              <p className="text-grey-ink">{t('room.no_free_today')}</p>
            )}
          </div>
        </section>
        <section>
          <h2 className="mb-2 font-semibold">{t('taken.other_rooms', { time: `${hm(draft.start)}–${hm(draft.end)}` })}</h2>
          <div className="grid gap-2">
            {others.length ? (
              others.map((sp) => (
                <button key={sp.id} onClick={() => pick({ spaceId: sp.id })} className="flex min-h-12 items-center justify-between rounded-2xl bg-surface px-4">
                  <span>
                    {L(sp.label)} · {t('map.people', { n: sp.capacity })}
                  </span>
                  <Icon name="next" size={18} className="rtl:rotate-180" />
                </button>
              ))
            ) : (
              <p className="text-grey-ink">{t('room.none_free')}</p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

/** R-08 Booking confirmed — also the booking detail page when opened from My bookings. */
export function Confirmed() {
  const { id } = useParams()
  const { state } = useLocation()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const s = useStore()
  const name = useSpaceName()
  const reasonText = useReasonText()
  const report = useReportBooking()
  const [cancelling, setCancelling] = useState(false)
  const b = s.data.bookings.find((x) => x.id === id)
  if (!b) return <ScreenTitle id="R-08" title={t('confirmed.title')} back />
  const fresh = !!state?.fresh
  const me = findRenter(s.data, b.renter_id)
  const sp = s.data.spaces.find((x) => x.id === b.space_id)
  const series = b.series_id ? s.data.bookings.filter((x) => x.series_id === b.series_id).length : 0
  const active = ACTIVE.includes(b.status) && b.status !== 'used'
  const started = s.now >= startAbs(b)
  return (
    <>
      <ScreenTitle id="R-08" title={fresh ? t('confirmed.title') : t('confirmed.details')} back={!fresh} />
      <div className="space-y-6 px-4">
        {fresh && (
          <div className="flex items-center gap-3 px-1">
            <span className="grid size-11 place-items-center rounded-full bg-teal text-white">
              <Icon name="check" size={24} />
            </span>
            <p className="text-[15px] text-grey-ink">{t('confirmed.receipt', { email: me.email || me.phone })}</p>
          </div>
        )}
        <Link to={`/r/room/${sp.id}`} className="flex items-center gap-4 rounded-2xl bg-surface p-3 active:bg-black/[0.04]">
          <Photo color={sp.photos[0]} className="!w-24 shrink-0 !rounded-xl" label={name(sp.id)} />
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">{name(sp.id)}</span>
            <span className="block text-[15px] text-grey-ink">{t('map.people', { n: sp.capacity })}</span>
          </span>
          <Icon name="next" size={16} className="text-grey-ink/60 rtl:rotate-180" />
        </Link>
        <Group>
          <GroupRow label={t('book.date')}>
            <span className="text-[17px] text-grey-ink">{fmtDate(b.date, s.lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </GroupRow>
          <GroupRow label={t('book.time')}>
            <span className="text-[17px] text-grey-ink" dir="ltr">
              {hm(b.start)}–{hm(b.end)}
            </span>
          </GroupRow>
          <GroupRow label={t('book.reason')}>
            <span className="truncate text-[17px] text-grey-ink">{reasonText(b)}</span>
          </GroupRow>
          <GroupRow label={t('book.reminder')}>
            <span className="text-[17px] text-grey-ink">{b.reminder_at ? fmtAbs(b.reminder_at, s.lang) : t('book.no_reminder_short')}</span>
          </GroupRow>
          <GroupRow label={t('bookings.status')}>
            <StatusChip
              status={b.status === 'used' ? 'checked_in' : b.status}
              label={b.status === 'used' && s.now < endAbs(b) ? t('bookings.in_room', { time: hm(b.end) }) : undefined}
            />
          </GroupRow>
        </Group>
        {series > 1 && <p className="px-1 text-[15px] text-grey-ink">{t('confirmed.series', { count: series })}</p>}
        <div className="grid gap-2">
          {b.status === 'awaiting_confirmation' && b.reminder_sent && (
            <Link to={`/r/reminder/${b.id}`} className="btn-primary">
              {t('bookings.confirm_now')}
            </Link>
          )}
          {fresh && (
            <Link to="/r/bookings" className="btn-primary">
              {t('confirmed.my_bookings')}
            </Link>
          )}
          <button className="btn-secondary !min-h-[50px]" onClick={() => s.showToast('toast.calendar')}>
            <Icon name="calendar" size={18} />
            {t('confirmed.calendar')}
          </button>
          {!fresh && active && !started && (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-secondary !min-h-[50px]" onClick={() => navigate(`/r/bookings/${b.id}/move`)}>
                {t('bookings.change')}
              </button>
              <button className="btn-danger !min-h-[50px]" onClick={() => setCancelling(true)}>
                {t('bookings.cancel')}
              </button>
            </div>
          )}
          {/* Once it has started, the thing to do is report a problem with it */}
          {!fresh && started && ['used', 'checked_in', 'confirmed'].includes(b.status) && (
            <button className="btn-danger !min-h-[50px]" onClick={() => report(b)}>
              <Icon name="flag" size={18} />
              {t('account.report')}
            </button>
          )}
          {fresh && (
            <Link to="/r/home" className="btn-link justify-center">
              {t('confirmed.done')}
            </Link>
          )}
        </div>
      </div>
      <Confirm
        open={cancelling}
        title={t('bookings.cancel_title')}
        body={t('bookings.cancel_body')}
        okLabel={t('bookings.cancel_ok')}
        danger
        onCancel={() => setCancelling(false)}
        onOk={() => {
          s.cancelWithUndo(b.id)
          setCancelling(false)
        }}
      />
    </>
  )
}
