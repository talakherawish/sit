import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useSpaceName } from '../lib/hooks'
import { freeStarts, isFree, isPaused, renter as findRenter } from '../lib/logic'
import { fmtDate, fmtAbs, hm, addDays } from '../lib/time'
import BookingForm from '../components/BookingForm'
import { Card, ScreenTitle, StatusChip } from '../components/ui'
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
    navigate(`/r/confirmed/${ids[0]}`, { replace: true })
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
            {same.length ? same.map((m) => (
              <button key={m} onClick={() => pick({ start: m, end: m + dur })} className="flex min-h-12 items-center justify-between rounded-lg bg-white px-4 ring-1 ring-grey/20">
                <span dir="ltr" className="font-semibold">{hm(m)}–{hm(m + dur)}</span>
                <Icon name="next" size={18} className="rtl:rotate-180" />
              </button>
            )) : <p className="text-grey-ink">{t('room.no_free_today')}</p>}
          </div>
        </section>
        <section>
          <h2 className="mb-2 font-semibold">{t('taken.other_rooms', { time: `${hm(draft.start)}–${hm(draft.end)}` })}</h2>
          <div className="grid gap-2">
            {others.length ? others.map((sp) => (
              <button key={sp.id} onClick={() => pick({ spaceId: sp.id })} className="flex min-h-12 items-center justify-between rounded-lg bg-white px-4 ring-1 ring-grey/20">
                <span>{L(sp.label)} · {t('map.people', { n: sp.capacity })}</span>
                <Icon name="next" size={18} className="rtl:rotate-180" />
              </button>
            )) : <p className="text-grey-ink">{t('room.none_free')}</p>}
          </div>
        </section>
      </div>
    </>
  )
}

/** R-08 Booking confirmed */
export function Confirmed() {
  const { id } = useParams()
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const data = useStore((s) => s.data)
  const showToast = useStore((s) => s.showToast)
  const name = useSpaceName()
  const b = data.bookings.find((x) => x.id === id)
  if (!b) return <ScreenTitle id="R-08" title={t('confirmed.title')} back />
  const me = findRenter(data, b.renter_id)
  const series = b.series_id ? data.bookings.filter((x) => x.series_id === b.series_id).length : 0
  return (
    <>
      <ScreenTitle id="R-08" title={t('confirmed.title')} />
      <div className="space-y-4 px-4">
        <div className="grid size-16 place-items-center rounded-full bg-teal/20 text-[#2f5656]"><Icon name="check" size={34} /></div>
        <Card>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-grey-ink">{t('book.room')}</dt><dd className="font-semibold">{name(b.space_id)}</dd>
            <dt className="text-grey-ink">{t('book.date')}</dt><dd>{fmtDate(b.date, lang)}</dd>
            <dt className="text-grey-ink">{t('book.time')}</dt><dd dir="ltr" className="text-start">{hm(b.start)}–{hm(b.end)}</dd>
            <dt className="text-grey-ink">{t('book.reason')}</dt><dd>{b.reason === 'other' ? b.reason_other : t(`reason.${b.reason}`)}</dd>
            <dt className="text-grey-ink">{t('book.reminder')}</dt><dd>{b.reminder_at ? fmtAbs(b.reminder_at, lang) : t('book.no_reminder_short')}</dd>
            <dt className="text-grey-ink">{t('bookings.status')}</dt><dd><StatusChip status={b.status} /></dd>
          </dl>
          {series > 1 && <p className="mt-2 text-sm font-medium">{t('confirmed.series', { count: series })}</p>}
        </Card>
        <p className="flex items-center gap-2 text-sm"><Icon name="check" size={18} className="text-teal" />{t('confirmed.receipt', { email: me.email || me.phone })}</p>
        <div className="grid gap-2">
          <Link to="/r/bookings" className="btn-primary">{t('confirmed.my_bookings')}</Link>
          <button className="btn-secondary" onClick={() => showToast('toast.calendar')}>{t('confirmed.calendar')}</button>
          <Link to="/r/home" className="btn-secondary">{t('confirmed.done')}</Link>
        </div>
      </div>
    </>
  )
}

/** R-21 Booking paused (#31) */
export function Paused() {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const data = useStore((s) => s.data)
  const renterId = useStore((s) => s.renterId)
  const me = findRenter(data, renterId)
  const rule = data.settings.no_show
  const until = me?.paused_until || addDays('2026-10-01', rule.pause)
  return (
    <>
      <ScreenTitle id="R-21" title={t('paused.title')} phase="later" back />
      <div className="space-y-4 px-4">
        <Card className="border-s-4 border-amber">
          <p className="text-lg font-semibold">{t('paused.body', { count: me?.no_show_count ?? rule.count, date: fmtDate(until, lang, { day: 'numeric', month: 'short' }) })}</p>
          <p className="mt-2 text-sm text-grey-ink">{t('paused.rule', { count: rule.count, days: rule.days, pause: rule.pause })}</p>
        </Card>
        <p>{t('paused.browse')}</p>
        <Link to="/r/home" className="btn-primary w-full">{t('paused.to_map')}</Link>
      </div>
    </>
  )
}
