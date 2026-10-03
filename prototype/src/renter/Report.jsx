import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useSpaceName } from '../lib/hooks'
import { ISSUE_TYPES, renter as findRenter } from '../lib/logic'
import { fmtAbs, fmtDate, hm } from '../lib/time'
import { Card, Chip, Empty, Field, ScreenTitle, StatusChip } from '../components/ui'
import { NeedLogin } from './RenterLayout'

/** R-16 Report an issue (#22). Opened from Account, or from a booking (then it's about that booking). */
export function Report() {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const s = useStore()
  const me = findRenter(s.data, s.renterId)
  const booking = s.data.bookings.find((b) => b.id === s.reportBooking)
  const [where, setWhere] = useState(booking?.space_id || s.reportSpace || 'public')
  const [types, setTypes] = useState([])
  const toggle = (k) => setTypes(types.includes(k) ? types.filter((x) => x !== k) : [...types, k])
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState(null)
  if (!me) return <NeedLogin returnTo="/r/report" />
  const send = (e) => {
    e.preventDefault()
    s.sendReport({ renter_id: me.id, space_id: where, booking_id: booking?.id || null, types, type: types[0], note: note.trim(), photo })
    s.set({ reportSpace: null, reportBooking: null })
    s.showToast('toast.report_sent')
    navigate('/r/reports')
  }
  return (
    <>
      <ScreenTitle id="R-16" title={t('report.title')} back>
        <Link to="/r/reports" className="btn-link shrink-0 text-sm">
          {t('report.mine')}
        </Link>
      </ScreenTitle>
      <form onSubmit={send} className="space-y-4 px-4">
        {booking ? (
          <div className="rounded-2xl bg-surface px-4 py-3">
            <p className="text-[13px] text-grey-ink">{t('report.about_booking')}</p>
            <p className="text-[17px] font-semibold">
              {L(s.data.spaces.find((x) => x.id === booking.space_id).label)} · {fmtDate(booking.date, s.lang)} ·{' '}
              <span dir="ltr" className="whitespace-nowrap">
                {hm(booking.start)}–{hm(booking.end)}
              </span>
            </p>
          </div>
        ) : (
        <Field label={t('report.where')}>
          <select className="input" value={where} onChange={(e) => setWhere(e.target.value)}>
            <option value="public">{L(s.data.zones[0].name)}</option>
            {s.data.spaces.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {L(sp.label)}
              </option>
            ))}
          </select>
        </Field>
        )}
        <fieldset>
          <legend className="mb-1 text-sm font-medium">{t('report.type')}</legend>
          <p className="mb-2 text-[13px] text-grey-ink">{t('report.type_hint')}</p>
          <div className="flex flex-wrap gap-2">
            {ISSUE_TYPES.map((k) => (
              <Chip key={k} active={types.includes(k)} onClick={() => toggle(k)}>
                {t(`issue.${k}`)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <Field label={t('report.note')} hint={`${note.length}/200`}>
          <textarea className="input min-h-24 py-2" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label={t('report.photo')}>
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm file:me-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-navy/10 file:px-4 file:font-semibold file:text-navy"
            onChange={(e) => setPhoto(e.target.files?.[0]?.name || null)}
          />
        </Field>
        <button className="btn-primary w-full" disabled={!types.length}>
          {t('report.send')}
        </button>
      </form>
    </>
  )
}

/** R-17 My reports (#23) */
export function MyReports() {
  const { t } = useTranslation()
  const name = useSpaceName()
  const s = useStore()
  const me = findRenter(s.data, s.renterId)
  if (!me) return <NeedLogin returnTo="/r/reports" />
  const mine = s.data.reports.filter((r) => r.renter_id === me.id)
  return (
    <>
      <ScreenTitle id="R-17" title={t('report.mine')} back />
      <div className="space-y-3 px-4">
        <Link to="/r/report" className="btn-primary w-full">
          {t('report.new')}
        </Link>
        {!mine.length && <Empty>{t('report.none')}</Empty>}
        {mine.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">
                  {r.types.map((k) => t(`issue.${k}`)).join(', ')} · {name(r.space_id)}
                </h2>
                {r.note && <p className="text-sm">{r.note}</p>}
              </div>
              <StatusChip status={r.status} label={t(`report_status.${r.status}`)} />
            </div>
            <ol className="mt-2 space-y-1 border-s-2 border-grey/20 ps-3 text-sm">
              {r.history.map((h, i) => (
                <li key={i}>
                  <span className="font-medium">{t(`report_status.${h.status}`)}</span> · <span className="text-grey-ink">{fmtAbs(h.time, s.lang)}</span>
                </li>
              ))}
            </ol>
            {r.reply && (
              <p className="mt-2 rounded-lg bg-surface p-2 text-sm">
                <span className="font-semibold">{t('report.staff_reply')}:</span> {r.reply}
              </p>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}
