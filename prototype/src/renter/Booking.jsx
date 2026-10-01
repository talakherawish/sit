import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useSpaceName } from '../lib/hooks'
import { ACTIVE, freeStarts, isFree, isPaused, dateOf, startAbs, renter as findRenter } from '../lib/logic'
import { fmtDate, fmtAbs, hm, addDays } from '../lib/time'
import BookingForm from '../components/BookingForm'
import { Card, Confirm, Group, GroupRow, Photo, ScreenTitle, StatusChip } from '../components/ui'
import Icon from '../components/Icon'
import { NeedLogin } from './RenterLayout'

/** R-06 Book a room */
export function Book() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const s = useStore()
  const me = findRenter(s.data, s.renterId)
  if (!me) return <NeedLogin returnTo="/r/book" />
  if (isPaused(me, s.now)) return <Paused />

  const submit = (f) => {
    const source = s.draft?.source || 'list'
    if (useStore.getState().justTaken) {
      s.stealSlot(f)
      s.set({ draft: { ...f, source } })
      return navigate('/r/taken')
    }
    const { ids, skipped } = s.createBooking({ ...f, renterId: me.id }, { source })
    s.set({ draft: null })
    if (skipped && ids.length) s.showToast('toast.series_skipped', { count: skipped })
    if (!ids.length) return navigate('/r/taken')
    navigate(`/r/confirmed/${ids[0]}`, { replace: true, state: { fresh: true } })
  }

  return (
    <>
      <ScreenTitle id="R-06" title={t('book.title')} back />
      <div className="px-4">
        <BookingForm key={JSON.stringify(s.draft)} initial={s.draft || {}} onSubmit={submit} />
      </div>
    </>
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
            <span className="truncate text-[17px] text-grey-ink">{b.reason === 'other' ? b.reason_other : t(`reason.${b.reason}`)}</span>
          </GroupRow>
          <GroupRow label={t('book.reminder')}>
            <span className="text-[17px] text-grey-ink">{b.reminder_at ? fmtAbs(b.reminder_at, s.lang) : t('book.no_reminder_short')}</span>
          </GroupRow>
          <GroupRow label={t('bookings.status')}>
            <StatusChip status={b.status} />
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
          {!fresh && active && started && <p className="px-1 text-center text-[15px] text-grey-ink">{t('bookings.started')}</p>}
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
          s.cancelBooking(b.id)
          s.showToast('toast.cancel_email')
          setCancelling(false)
        }}
      />
    </>
  )
}

/** R-21 Booking paused (#31) */
export function Paused() {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const renterId = useStore((s) => s.renterId)
  const me = findRenter(data, renterId)
  const rule = data.settings.no_show
  const until = me?.paused_until || addDays(dateOf(now), rule.pause)
  return (
    <>
      <ScreenTitle id="R-21" title={t('paused.title')} phase="later" back />
      <div className="space-y-4 px-4">
        <Card className="border-s-4 border-amber">
          <p className="text-lg font-semibold">
            {t('paused.body', { count: me?.no_show_count ?? rule.count, date: fmtDate(until, lang, { day: 'numeric', month: 'short' }) })}
          </p>
          <p className="mt-2 text-sm text-grey-ink">{t('paused.rule', { count: rule.count, days: rule.days, pause: rule.pause })}</p>
        </Card>
        <p>{t('paused.browse')}</p>
        <Link to="/r/home" className="btn-primary w-full">
          {t('paused.to_map')}
        </Link>
      </div>
    </>
  )
}
