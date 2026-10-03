import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useSpaceName, STAFF, usePersonName } from '../lib/hooks'
import { ACTIVE, activeNotices, normPhone, staffStatus, dateOf, endAbs, minOfDay, startAbs, renter as findRenter } from '../lib/logic'
import { fmtAbs, hm } from '../lib/time'
import { Card, Confirm, Modal, ScreenId, StatusChip } from '../components/ui'
import Icon from '../components/Icon'
import { SignUpForm } from '../renter/Auth'
import { StaffTitle } from './StaffLayout'
import RoomsDay from './RoomsDay'

export function SeatCounter() {
  const { t } = useTranslation()
  const seats = useStore((s) => s.data.seats)
  const adjust = useStore((s) => s.adjustSeats)
  const reset = useStore((s) => s.resetSeats)
  const [resetting, setResetting] = useState(false)
  const { taken, total } = seats
  return (
    <section className="rounded-[22px] bg-surface p-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-grey-ink">
        <span className="live-dot size-2 rounded-full bg-teal" />
        {t('home.live')} · {t('staff.open_area')}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          className="grid size-14 place-items-center rounded-2xl bg-navy/[0.08] text-navy active:scale-95 disabled:opacity-40"
          disabled={taken <= 0}
          onClick={() => adjust(-1)}
          aria-label={t('staff.minus')}
        >
          <Icon name="minus" size={26} />
        </button>
        <p className="text-center" aria-live="polite">
          <span className="flex items-baseline justify-center gap-1.5" dir="ltr">
            <span className="font-head text-[64px] leading-none font-bold tracking-tight">{taken}</span>
            <span className="font-head text-[26px] font-semibold text-grey-ink">/ {total}</span>
          </span>
          <span className="block text-[13px] text-grey-ink">{t('staff.people_in')}</span>
        </p>
        <button
          className="grid size-14 place-items-center rounded-2xl bg-navy text-white active:scale-95 disabled:bg-grey/30"
          disabled={taken >= total}
          onClick={() => adjust(+1)}
          aria-label={t('staff.plus')}
        >
          <Icon name="plus" size={26} />
        </button>
      </div>
      {/* one tick per seat, as on the renter's Today: tall teal = free */}
      <span className="mt-4 flex h-6 items-end gap-[3px]" dir="ltr" aria-hidden="true">
        {Array.from({ length: total }, (_, k) => (
          <span key={k} className={`flex-1 rounded-full transition-all ${k < taken ? 'h-2.5 bg-black/[0.12]' : 'h-full bg-teal'}`} />
        ))}
      </span>
      <p className="mt-3 text-[17px] font-semibold text-[#2f5656]">{t('home.seats_free', { count: total - taken })}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[13px] text-grey-ink">{t('staff.counter_hint')}</p>
        <span className="flex shrink-0 items-center gap-4">
          <button className="btn-link !text-[15px] !text-[#a32f2f] disabled:opacity-40" disabled={taken === 0} onClick={() => setResetting(true)}>
            {t('staff.reset_seats')}
          </button>
          <Link to="/s/seat-log" className="btn-link !text-[15px]">
            {t('staff.view_log')}
          </Link>
        </span>
      </div>
      <Confirm
        open={resetting}
        title={t('staff.reset_title')}
        body={t('staff.reset_body', { count: taken })}
        okLabel={t('staff.reset_ok')}
        danger
        onOk={() => {
          reset()
          setResetting(false)
        }}
        onCancel={() => setResetting(false)}
      />
    </section>
  )
}

const NOTICE_ICON = { wifi: 'wifi', events: 'megaphone', ac: 'drop', cleaning: 'drop' }

/** S-01 Today */
export function Today() {
  const { t } = useTranslation()
  const pn = usePersonName()
  const L = useL()
  const navigate = useNavigate()
  const name = useSpaceName()
  const s = useStore()
  const [sort, setSort] = useState('time')
  const date = dateOf(s.now)
  const statusPosted = s.data.notices.some((n) => n.daily && !n.removed && dateOf(n.posted_at) === date)
  const order = {
    time: (a, b) => a.start - b.start,
    room: (a, b) => name(a.space_id).localeCompare(name(b.space_id)) || a.start - b.start,
    status: (a, b) => staffStatus(a).localeCompare(staffStatus(b)) || a.start - b.start,
    renter: (a, b) => pn(findRenter(s.data, a.renter_id)).localeCompare(pn(findRenter(s.data, b.renter_id))),
  }
  const bookings = s.data.bookings.filter((b) => b.date === date).sort(order[sort])
  const notices = activeNotices(s.data, s.now)
  const newReports = s.data.reports.filter((r) => r.status === 'sent').length

  return (
    <>
      <StaffTitle id="S-01" title={t('staff.today_title')} />
      {!statusPosted && (
        <Link to="/s/notices" className="mb-6 flex min-h-14 items-center gap-3 rounded-2xl bg-amber/15 px-5 text-[15px] font-medium">
          <Icon name="megaphone" size={20} className="text-[#7a4f00]" />
          {t('staff.no_status')}
          <span className="ms-auto font-semibold text-navy">{t('staff.post_now')} ›</span>
        </Link>
      )}
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <SeatCounter />

          <section className="rounded-[22px] bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-head text-[22px] font-bold tracking-tight">{t('staff.notices')}</h2>
              <Link to="/s/notices" className="btn-secondary !min-h-9 !px-3 !text-[15px]">
                {t('staff.post_notice')}
              </Link>
            </div>
            {notices.length ? (
              <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl bg-white">
                {notices.map((n) => (
                  <li key={n.id} className="flex gap-3 px-4 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface text-navy">
                      <Icon name={NOTICE_ICON[n.tag] || 'megaphone'} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug">{L(n.text)}</span>
                      <span className="block text-[13px] text-grey-ink">
                        {t(`tag.${n.tag}`)} · {hm(minOfDay(n.posted_at))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-grey-ink">{t('staff.no_notices')}</p>
            )}
          </section>

          <Link to="/s/reports" className="flex items-center gap-4 rounded-[22px] bg-surface p-5 hover:bg-black/[0.04]">
            <span className="font-head text-[40px] leading-none font-bold">{newReports}</span>
            <span className="flex-1">
              <span className="block text-[17px] font-semibold">{t('staff.reports')}</span>
              <span className="text-[13px] text-grey-ink">{t('staff.new_reports')}</span>
            </span>
            <Icon name="next" size={18} className="text-grey-ink/60 rtl:rotate-180" />
          </Link>
        </div>

        <div className="min-w-0 space-y-6">
          <RoomsDay />

          <section className="rounded-[22px] bg-surface p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-head text-[22px] font-bold tracking-tight">
                {t('staff.todays_bookings')} <span className="text-[15px] font-medium text-grey-ink">· {bookings.length}</span>
              </h2>
              <label className="flex min-h-10 items-center gap-1 text-[15px] font-medium text-navy">
                <span className="text-grey-ink">{t('bookings.sort')}:</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent font-medium text-navy outline-none">
                  {['time', 'room', 'renter', 'status'].map((k) => (
                    <option key={k} value={k}>
                      {t(`staff.sort_${k}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/[0.06]">
              <table className="w-full text-start text-[15px]">
                <thead className="text-[13px] font-medium text-grey-ink">
                  <tr className="border-b border-black/[0.08]">
                    <th className="px-4 py-2.5 text-start">{t('staff.col_renter')}</th>
                    <th className="text-start">{t('staff.col_room')}</th>
                    <th className="text-start">{t('staff.col_time')}</th>
                    <th className="text-start">{t('staff.col_reason')}</th>
                    <th className="pe-4 text-start">{t('staff.col_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const r = findRenter(s.data, b.renter_id)
                    const st = staffStatus(b)
                    return (
                      <tr
                        key={b.id}
                        onClick={() => navigate(`/s/checkin?renter=${r.id}`)}
                        className="cursor-pointer border-b border-black/[0.05] last:border-0 hover:bg-black/[0.025]"
                      >
                        <td className="px-4 py-3 font-medium">{pn(r)}</td>
                        <td>{name(b.space_id)}</td>
                        <td dir="ltr" className="text-start tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            {hm(b.start)}–{hm(b.end)}
                            {b.series_id && (
                              <span title={t('bookings.series')} className="text-grey-ink">
                                <Icon name="repeat" size={14} />
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="text-grey-ink">{!b.reason ? '—' : b.reason === 'other' ? b.reason_other : t(`reason.${b.reason}`)}</td>
                        <td className="pe-4">
                          {/* Awaiting vs confirmed, as on the timeline, so a renter confirming from their phone shows up here too */}
                          {st === 'upcoming' ? <StatusChip status={b.status} /> : <StatusChip status={st} label={t(`staff_status.${st}`)} />}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

/** S-02 Check-in / check-out */
export function CheckIn() {
  const { t } = useTranslation()
  const pn = usePersonName()
  const name = useSpaceName()
  const s = useStore()
  const [params] = useSearchParams()
  const pre = findRenter(s.data, params.get('renter'))
  const [q, setQ] = useState(pre?.name || '')
  const [walkIn, setWalkIn] = useState(false)
  const date = dateOf(s.now)
  const ql = q.trim().toLowerCase()
  const bookersToday = new Set(s.data.bookings.filter((b) => b.date === date && ACTIVE.includes(b.status)).map((b) => b.renter_id))
  const open = new Set(s.data.visits.filter((v) => !v.check_out).map((v) => v.renter_id))
  const results = s.data.renters.filter((r) =>
    ql
      ? [r.name, r.name_ar].some((n) => n?.toLowerCase().includes(ql)) || (normPhone(ql) && normPhone(r.phone).includes(normPhone(ql)))
      : bookersToday.has(r.id) || open.has(r.id),
  )

  const doIn = (r, bookingId) => {
    const res = s.checkIn(r.id, bookingId)
    if (res.error) return s.showToast(`toast.err_${res.error}`, { name: pn(r) })
    s.showToast(res.via === 'sit' ? 'toast.checked_in_room' : 'toast.checked_in_walk', {
      name: pn(r),
      room: res.bookingId ? name(s.data.bookings.find((b) => b.id === res.bookingId).space_id) : '',
    })
  }
  // A booking can be checked in from 30 minutes before it starts until it ends.
  const isDue = (b) => ['awaiting_confirmation', 'confirmed'].includes(b.status) && startAbs(b) - 30 <= s.now && endAbs(b) > s.now
  const seatsFull = s.data.seats.taken >= s.data.seats.total
  const doOut = (r) => {
    const via = s.checkOut(r.id)
    s.showToast(via === 'sit' ? 'toast.checked_out_rate' : 'toast.checked_out', { name: pn(r) })
  }

  return (
    <>
      <StaffTitle id="S-02" title={t('staff.checkin_title')}>
        <button className="btn-secondary" onClick={() => setWalkIn(true)}>
          <Icon name="plus" size={18} />
          {t('staff.new_walkin')}
        </button>
      </StaffTitle>
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card>
          <label className="relative block">
            <span className="sr-only">{t('staff.search')}</span>
            <Icon name="search" className="absolute start-3 top-3 text-grey-ink" />
            <input className="input !ps-11 !text-lg" autoFocus placeholder={t('staff.search')} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {!ql && <p className="mt-2 text-sm text-grey-ink">{t('staff.showing_today')}</p>}
          <ul className="mt-3 divide-y divide-black/[0.06]" aria-live="polite">
            {!results.length && <li className="py-4 text-grey-ink">{t('staff.no_results')}</li>}
            {results.map((r) => {
              const visit = s.data.visits.find((v) => v.renter_id === r.id && !v.check_out)
              const todays = s.data.bookings.filter((b) => b.renter_id === r.id && b.date === date).sort((x, y) => x.start - y.start)
              const due = todays.filter(isDue)
              const where = visit ? (visit.seat ? t('staff.at_public') : name(s.data.bookings.find((b) => b.id === visit.booking_id)?.space_id)) : null
              return (
                <li key={r.id} className={`flex flex-wrap items-start gap-3 py-4 ${pre?.id === r.id ? 'bg-navy/5' : ''}`}>
                  <div className="min-w-56 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold">
                      {pn(r)} {visit && <StatusChip status="checked_in" label={`${t('staff.inside')} · ${where}`} />}
                    </p>
                    <p className="text-[13px] text-grey-ink" dir="ltr">
                      {r.phone}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {todays.length ? (
                        todays.map((b) => (
                          <li key={b.id} className="flex flex-wrap items-center gap-2 text-[15px]">
                            <span>
                              {name(b.space_id)} ·{' '}
                              <span dir="ltr" className="tabular-nums">
                                {hm(b.start)}–{hm(b.end)}
                              </span>
                            </span>
                            <StatusChip status={b.status} />
                            {isDue(b)
                              ? visit && (
                                  <button className="btn-secondary !min-h-9 !px-3 !text-[14px]" onClick={() => doIn(r, b.id)}>
                                    {t('staff.move_to_room', { room: name(b.space_id) })}
                                  </button>
                                )
                              : ACTIVE.includes(b.status) &&
                                b.status !== 'used' &&
                                startAbs(b) > s.now && <span className="text-[13px] text-grey-ink">{t('staff.checkin_from', { time: hm(b.start - 30) })}</span>}
                          </li>
                        ))
                      ) : (
                        <li className="text-[15px] text-grey-ink">{t('staff.no_booking_today')}</li>
                      )}
                    </ul>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/s/book?renter=${r.id}`} className="btn-secondary !min-h-11 !px-4 !text-[15px]">
                      <Icon name="calendar" size={18} />
                      {t('staff_book.book')}
                    </Link>
                    {visit ? (
                      <button className="btn-secondary min-w-36" onClick={() => doOut(r)}>
                        {t('staff.check_out')}
                      </button>
                    ) : due.length ? (
                      <button className="btn-primary min-w-36 !text-[16px]" onClick={() => doIn(r, due[0].id)}>
                        {t('staff.check_in_to', { room: name(due[0].space_id) })}
                      </button>
                    ) : (
                      <button
                        className="btn-primary min-w-36 !text-[16px]"
                        disabled={seatsFull}
                        onClick={() => doIn(r)}
                        title={seatsFull ? t('toast.err_full') : undefined}
                      >
                        {seatsFull ? t('staff.seats_full') : t('staff.check_in_walk')}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
        <SeatCounter />
      </div>
      <Modal open={walkIn} onClose={() => setWalkIn(false)} title={t('staff.new_walkin')}>
        <ScreenId id="R-10" />
        <p className="mb-3 text-sm text-grey-ink">{t('staff.walkin_hint')}</p>
        <SignUpForm
          onExisting={(r) => {
            setQ(r.name)
            setWalkIn(false)
          }}
          onDone={(f) => {
            s.createRenter(f)
            setQ(f.name)
            setWalkIn(false)
            s.showToast('toast.account_created', { name: f.name })
          }}
        />
      </Modal>
    </>
  )
}

/** S-03 Seat-count log */
export function SeatLog() {
  const { t } = useTranslation()
  const pn = usePersonName()
  const lang = useStore((s) => s.lang)
  const log = useStore((s) => s.data.seat_log)
  return (
    <>
      <StaffTitle id="S-03" title={t('staff.log_title')}>
        <Link to="/s/today" className="btn-secondary">
          {t('staff.nav_today')}
        </Link>
      </StaffTitle>
      <Card>
        <table className="w-full">
          <thead className="text-[13px] font-medium text-grey-ink">
            <tr className="border-b border-black/[0.08]">
              <th className="py-2 text-start">{t('staff.col_time')}</th>
              <th className="text-start">{t('staff.col_change')}</th>
              <th className="text-start">{t('staff.col_source')}</th>
              <th className="text-start">{t('staff.col_total')}</th>
              <th className="text-start">{t('staff.col_staff')}</th>
            </tr>
          </thead>
          <tbody>
            {[...log].reverse().map((l, i) => (
              <tr key={i} className="border-b border-black/[0.06]">
                <td className="py-2">{fmtAbs(l.time, lang)}</td>
                <td className="font-semibold" dir="ltr">
                  {l.change}
                </td>
                <td>{t(`seat_source.${l.source}`)}</td>
                <td className="font-head text-lg font-bold">{l.new_total}</td>
                <td>{l.staff === STAFF.name ? pn(STAFF) : l.staff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
