import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useSpaceName } from '../lib/hooks'
import { ACTIVE, activeNotices, bookingAt, downAt, normPhone, staffStatus, today, nowMin, renter as findRenter } from '../lib/logic'
import { fmtAbs, hm } from '../lib/time'
import { Card, Modal, PhaseBadge, StatusChip } from '../components/ui'
import Icon from '../components/Icon'
import { SignUpForm } from '../renter/Auth'
import { StaffTitle } from './StaffLayout'

export function SeatCounter({ big }) {
  const { t } = useTranslation()
  const seats = useStore((s) => s.data.seats)
  const adjust = useStore((s) => s.adjustSeats)
  return (
    <Card>
      <h2 className="font-head text-xl font-bold">{t('staff.open_area')}</h2>
      <div className="my-3 flex items-center justify-between gap-3">
        <button className="grid size-14 place-items-center rounded-lg border border-navy/40 text-navy disabled:opacity-40" disabled={seats.taken <= 0} onClick={() => adjust(-1)} aria-label={t('staff.minus')}>
          <Icon name="minus" size={26} />
        </button>
        <p className={`font-head font-bold ${big ? "text-6xl" : "text-5xl"}`} aria-live="polite" dir="ltr">{seats.taken}<span className="text-2xl text-grey-ink"> / {seats.total}</span></p>
        <button className="grid size-14 place-items-center rounded-lg bg-orange text-white disabled:bg-grey/30" disabled={seats.taken >= seats.total} onClick={() => adjust(+1)} aria-label={t('staff.plus')}>
          <Icon name="plus" size={26} />
        </button>
      </div>
      <p className="text-sm text-grey-ink">{t('staff.counter_hint')}</p>
      <Link to="/s/seat-log" className="btn-link">{t('staff.view_log')}</Link>
    </Card>
  )
}

/** S-01 Today */
export function Today() {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const name = useSpaceName()
  const s = useStore()
  const [menu, setMenu] = useState(null)
  const date = today(s.now)
  const min = nowMin(s.now)
  const statusPosted = s.data.notices.some((n) => n.daily && !n.removed && today(n.posted_at) === date)
  const bookings = s.data.bookings.filter((b) => b.date === date).sort((a, b) => a.start - b.start)
  const notices = activeNotices(s.data, s.now)
  const newReports = s.data.reports.filter((r) => r.status === 'sent').length

  const roomStatus = (sp) => {
    if (downAt(sp, date, min, min + 1)) return 'down'
    const b = bookingAt(s.data, sp.id, date, min, min + 1)
    if (!b) return 'free'
    return b.status === 'used' ? 'in_use' : 'booked'
  }

  return (
    <>
      <StaffTitle id="S-01" title={t('staff.today_title')} />
      {!statusPosted && (
        <Link to="/s/notices" className="mb-5 flex items-center gap-3 rounded-lg bg-amber/20 p-4 font-semibold ring-1 ring-amber">
          <Icon name="megaphone" /> {t('staff.no_status')} <span className="ms-auto text-navy underline">{t('staff.post_now')}</span>
        </Link>
      )}
      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <SeatCounter big />
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-head text-xl font-bold">{t('staff.notices')}</h2>
              <Link to="/s/notices" className="btn-primary !min-h-10 !text-base">{t('staff.post_notice')}</Link>
            </div>
            {notices.length ? (
              <ul className="space-y-2">{notices.map((n) => <li key={n.id} className="rounded-lg bg-surface p-2 text-sm"><b>{t(`tag.${n.tag}`)}</b> · {L(n.text)} <span className="text-grey-ink">({hm(nowMin(n.posted_at))})</span></li>)}</ul>
            ) : <p className="text-grey-ink">{t('staff.no_notices')}</p>}
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-head text-xl font-bold">{t('staff.reports')} <PhaseBadge phase="next" /></h2>
              <Link to="/s/reports" className="btn-link">{t('staff.open')}</Link>
            </div>
            <p><span className="font-head text-3xl font-bold">{newReports}</span> {t('staff.new_reports')}</p>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <h2 className="mb-2 font-head text-xl font-bold">{t('staff.todays_bookings')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead className="text-sm text-grey-ink">
                  <tr className="border-b border-grey/20"><th className="py-2 text-start">{t('staff.col_renter')}</th><th className="text-start">{t('staff.col_room')}</th><th className="text-start">{t('staff.col_time')}</th><th className="text-start">{t('staff.col_reason')}</th><th className="text-start">{t('staff.col_status')}</th></tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const r = findRenter(s.data, b.renter_id)
                    const st = staffStatus(b, s.now)
                    return (
                      <tr key={b.id} onClick={() => navigate(`/s/checkin?renter=${r.id}`)} className="cursor-pointer border-b border-grey/10 hover:bg-surface">
                        <td className="py-2.5 font-medium">{r.name}</td>
                        <td>{name(b.space_id)}</td>
                        <td dir="ltr" className="text-start">{hm(b.start)}–{hm(b.end)}</td>
                        <td>{b.reason === 'other' ? b.reason_other : t(`reason.${b.reason}`)}</td>
                        <td><StatusChip status={st} label={t(`staff_status.${st}`)} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 font-head text-xl font-bold">{t('staff.rooms_now')}</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
              {s.data.spaces.map((sp) => {
                const st = roomStatus(sp)
                return (
                  <div key={sp.id} className={`relative rounded-lg p-3 ring-1 ${st === 'down' ? 'hatch ring-red' : 'bg-surface ring-grey/20'}`}>
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold">{L(sp.label)}</span>
                      <button className="-me-2 -mt-2 grid size-10 place-items-center rounded-lg text-navy hover:bg-white" onClick={() => setMenu(menu === sp.id ? null : sp.id)} aria-label={t('staff.room_menu')} aria-expanded={menu === sp.id}>⋯</button>
                    </div>
                    <StatusChip status={st} label={t(`room_status.${st}`)} />
                    {st === 'down' && <p className="mt-1 text-sm">{sp.down.reason}</p>}
                    {menu === sp.id && (
                      <div className="absolute end-2 top-10 z-10 w-48 rounded-lg bg-white p-1 shadow-lg ring-1 ring-grey/20">
                        {sp.down ? (
                          <button className="block min-h-11 w-full rounded px-3 text-start hover:bg-surface" onClick={() => { s.markRoomUp(sp.id); setMenu(null) }}>{t('staff.mark_up')}</button>
                        ) : (
                          <button className="block min-h-11 w-full rounded px-3 text-start text-[#a32f2f] hover:bg-surface" onClick={() => navigate(`/s/room-down?space=${sp.id}`)}>{t('staff.mark_down')}</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

/** S-02 Check-in / check-out */
export function CheckIn() {
  const { t } = useTranslation()
  const name = useSpaceName()
  const s = useStore()
  const [params] = useSearchParams()
  const pre = findRenter(s.data, params.get('renter'))
  const [q, setQ] = useState(pre?.name || '')
  const [walkIn, setWalkIn] = useState(false)
  const date = today(s.now)
  const ql = q.trim().toLowerCase()
  const bookersToday = new Set(s.data.bookings.filter((b) => b.date === date && ACTIVE.includes(b.status)).map((b) => b.renter_id))
  const open = new Set(s.data.visits.filter((v) => !v.check_out).map((v) => v.renter_id))
  const results = s.data.renters.filter((r) =>
    ql ? r.name.toLowerCase().includes(ql) || (normPhone(ql) && normPhone(r.phone).includes(normPhone(ql))) : bookersToday.has(r.id) || open.has(r.id))

  const doIn = (r) => {
    const hasBooking = s.data.bookings.some((b) => b.renter_id === r.id && b.date === date && ['awaiting_confirmation', 'confirmed'].includes(b.status))
    s.checkIn(r.id)
    s.showToast(hasBooking ? 'toast.checked_in_sit' : 'toast.checked_in_walk', { name: r.name })
  }
  const doOut = (r) => {
    const v = s.data.visits.find((x) => x.renter_id === r.id && !x.check_out)
    s.checkOut(r.id)
    s.showToast(v?.via === 'sit' ? 'toast.checked_out_rate' : 'toast.checked_out', { name: r.name })
  }

  return (
    <>
      <StaffTitle id="S-02" title={t('staff.checkin_title')}>
        <button className="btn-secondary" onClick={() => setWalkIn(true)}><Icon name="plus" size={18} />{t('staff.new_walkin')}</button>
      </StaffTitle>
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card>
          <label className="relative block">
            <span className="sr-only">{t('staff.search')}</span>
            <Icon name="search" className="absolute start-3 top-3 text-grey-ink" />
            <input className="input !ps-11 !text-lg" autoFocus placeholder={t('staff.search')} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {!ql && <p className="mt-2 text-sm text-grey-ink">{t('staff.showing_today')}</p>}
          <ul className="mt-3 divide-y divide-grey/15" aria-live="polite">
            {!results.length && <li className="py-4 text-grey-ink">{t('staff.no_results')}</li>}
            {results.map((r) => {
              const isIn = open.has(r.id)
              const todays = s.data.bookings.filter((b) => b.renter_id === r.id && b.date === date)
              return (
                <li key={r.id} className={`flex flex-wrap items-center gap-3 py-3 ${pre?.id === r.id ? 'bg-orange/5' : ''}`}>
                  <div className="min-w-48 flex-1">
                    <p className="font-semibold">{r.name} {isIn && <StatusChip status="checked_in" label={t('staff.inside')} />}</p>
                    <p className="text-sm text-grey-ink" dir="ltr">{r.phone}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {todays.length ? todays.map((b) => (
                        <span key={b.id} className="text-sm">{name(b.space_id)} · <span dir="ltr">{hm(b.start)}–{hm(b.end)}</span> <StatusChip status={b.status} /></span>
                      )) : <span className="text-sm text-grey-ink">{t('staff.no_booking_today')}</span>}
                    </div>
                  </div>
                  <Link to={`/s/book-for?renter=${r.id}`} className="btn-secondary">{t('staff.book_for')} <PhaseBadge phase="next" /></Link>
                  {isIn
                    ? <button className="btn-secondary min-w-32" onClick={() => doOut(r)}>{t('staff.check_out')}</button>
                    : <button className="btn-primary min-w-32" onClick={() => doIn(r)}>{t('staff.check_in')}</button>}
                </li>
              )
            })}
          </ul>
        </Card>
        <SeatCounter />
      </div>
      <Modal open={walkIn} onClose={() => setWalkIn(false)} title={t('staff.new_walkin')}>
        <p className="mb-3 text-sm text-grey-ink">R-10 · {t('staff.walkin_hint')}</p>
        <SignUpForm
          onExisting={(r) => { setQ(r.name); setWalkIn(false) }}
          onDone={(f) => { s.createRenter(f); setQ(f.name); setWalkIn(false); s.showToast('toast.account_created', { name: f.name }) }}
        />
      </Modal>
    </>
  )
}

/** S-03 Seat-count log */
export function SeatLog() {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const log = useStore((s) => s.data.seat_log)
  return (
    <>
      <StaffTitle id="S-03" title={t('staff.log_title')}>
        <Link to="/s/today" className="btn-secondary">{t('staff.nav_today')}</Link>
      </StaffTitle>
      <Card>
        <table className="w-full">
          <thead className="text-sm text-grey-ink">
            <tr className="border-b border-grey/20"><th className="py-2 text-start">{t('staff.col_time')}</th><th className="text-start">{t('staff.col_change')}</th><th className="text-start">{t('staff.col_source')}</th><th className="text-start">{t('staff.col_total')}</th><th className="text-start">{t('staff.col_staff')}</th></tr>
          </thead>
          <tbody>
            {[...log].reverse().map((l, i) => (
              <tr key={i} className="border-b border-grey/10">
                <td className="py-2">{fmtAbs(l.time, lang)}</td>
                <td className="font-semibold" dir="ltr">{l.change}</td>
                <td>{t(`seat_source.${l.source}`)}</td>
                <td className="font-head text-lg font-bold">{l.new_total}</td>
                <td>{l.staff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
