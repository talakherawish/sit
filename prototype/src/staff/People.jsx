import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useSpaceName, usePersonName } from '../lib/hooks'
import { dateOf, endAbs, minOfDay, normPhone, renter as findRenter } from '../lib/logic'
import { fmtAbs, fmtDate, hm } from '../lib/time'
import { Card, StatusChip } from '../components/ui'
import Icon from '../components/Icon'
import { StaffTitle } from './StaffLayout'

const TABLE =
  'w-full text-[15px] [&_td]:px-2.5 [&_td]:py-3 [&_td:first-child]:ps-0 [&_td:last-child]:pe-0 [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-start [&_th]:font-medium [&_th:first-child]:ps-0 [&_th:last-child]:pe-0'

/** S-06 People: every renter account and every visit */
export function People() {
  const { t } = useTranslation()
  const pn = usePersonName()
  const name = useSpaceName()
  const navigate = useNavigate()
  const s = useStore()
  const [q, setQ] = useState('')
  const ql = q.trim().toLowerCase()
  const matches = (r) =>
    !ql || [r.name, r.name_ar, r.email].some((n) => n?.toLowerCase().includes(ql)) || (normPhone(ql) && normPhone(r.phone).includes(normPhone(ql)))

  const visitsOf = (id) => s.data.visits.filter((v) => v.renter_id === id)
  const where = (v) => (v.seat ? name('public') : name(s.data.bookings.find((b) => b.id === v.booking_id)?.space_id))
  const renters = s.data.renters.filter(matches).sort((a, b) => pn(a).localeCompare(pn(b)))
  const visits = s.data.visits
    .filter((v) => matches(findRenter(s.data, v.renter_id) || {}))
    // People inside now first, then newest first.
    .sort((a, b) => !b.check_out - !a.check_out || b.check_in - a.check_in)
  const inside = s.data.visits.filter((v) => !v.check_out).length

  return (
    <>
      <StaffTitle id="S-06" title={t('people.title')}>
        <label className="relative block w-80 max-w-full">
          <span className="sr-only">{t('staff.search')}</span>
          <Icon name="search" className="absolute start-3 top-3 text-grey-ink" />
          <input className="input !ps-11" placeholder={t('people.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </StaffTitle>

      <div className="space-y-6">
        <Card className="overflow-x-auto">
          <h2 className="font-head text-[22px] font-bold tracking-tight">
            {t('people.renters')} <span className="text-[15px] font-medium text-grey-ink">· {renters.length}</span>
          </h2>
          <p className="mb-3 text-[13px] text-grey-ink">{t('people.renters_hint')}</p>
          <table className={`${TABLE} min-w-[820px]`}>
            <thead className="text-[13px] text-grey-ink">
              <tr className="border-b border-black/[0.08]">
                {['name', 'contact', 'prefers', 'upcoming', 'visits', 'last_visit', 'now'].map((c) => (
                  <th key={c} className={c === 'upcoming' || c === 'visits' ? '!text-end' : ''}>
                    {t(`people.col_${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!renters.length && (
                <tr>
                  <td colSpan={7} className="text-grey-ink">
                    {t('staff.no_results')}
                  </td>
                </tr>
              )}
              {renters.map((r) => {
                const vs = visitsOf(r.id)
                const open = vs.find((v) => !v.check_out)
                const last = vs.reduce((m, v) => Math.max(m, v.check_in), 0)
                const upcoming = s.data.bookings.filter(
                  (b) => b.renter_id === r.id && ['awaiting_confirmation', 'confirmed'].includes(b.status) && endAbs(b) > s.now,
                ).length
                return (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/s/checkin?renter=${r.id}`)}
                    className="cursor-pointer border-b border-black/[0.06] align-middle last:border-0 hover:bg-black/[0.025]"
                  >
                    <td>
                      <span className="block font-semibold whitespace-nowrap">{pn(r)}</span>
                      {r.no_show_count > 0 && <StatusChip status="no_show" label={t('people.no_shows', { count: r.no_show_count })} />}
                      {r.paused_until && (
                        <span className="block text-[13px] text-[#a32f2f]">{t('people.paused', { date: fmtDate(r.paused_until, s.lang) })}</span>
                      )}
                    </td>
                    <td>
                      <span dir="ltr" className="block whitespace-nowrap tabular-nums">
                        {r.phone}
                      </span>
                      {r.email && <span className="block text-[13px] text-grey-ink">{r.email}</span>}
                    </td>
                    <td className="whitespace-nowrap">
                      {t(`profile.${r.preferred_contact}`)} · {t(`people.lang_${r.language}`)}
                    </td>
                    <td className="text-end tabular-nums">{upcoming}</td>
                    <td className="text-end tabular-nums">{vs.length}</td>
                    <td className="text-sm whitespace-nowrap text-grey-ink">{last ? fmtAbs(last, s.lang) : t('people.never')}</td>
                    <td className="whitespace-nowrap">{open ? <StatusChip status="checked_in" label={`${t('staff.inside')} · ${where(open)}`} /> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        <Card className="overflow-x-auto">
          <h2 className="font-head text-[22px] font-bold tracking-tight">
            {t('people.visitors')} <span className="text-[15px] font-medium text-grey-ink">· {visits.length}</span>
          </h2>
          <p className="mb-3 text-[13px] text-grey-ink">{t('people.visitors_hint', { inside, taken: s.data.seats.taken })}</p>
          <table className={`${TABLE} min-w-[760px]`}>
            <thead className="text-[13px] text-grey-ink">
              <tr className="border-b border-black/[0.08]">
                {['name', 'date', 'in', 'out', 'where', 'how'].map((c) => (
                  <th key={c}>{t(`people.col_${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!visits.length && (
                <tr>
                  <td colSpan={6} className="text-grey-ink">
                    {t('staff.no_results')}
                  </td>
                </tr>
              )}
              {visits.map((v) => {
                const r = findRenter(s.data, v.renter_id)
                return (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/s/checkin?renter=${v.renter_id}`)}
                    className={`cursor-pointer border-b border-black/[0.06] align-middle last:border-0 hover:bg-black/[0.025] ${v.check_out ? '' : 'bg-teal/[0.06]'}`}
                  >
                    <td className="font-semibold whitespace-nowrap">{pn(r)}</td>
                    <td className="whitespace-nowrap">{fmtDate(dateOf(v.check_in), s.lang)}</td>
                    <td dir="ltr" className="text-start tabular-nums">
                      {hm(minOfDay(v.check_in))}
                    </td>
                    <td className="whitespace-nowrap">
                      {v.check_out ? (
                        <span dir="ltr" className="tabular-nums">
                          {hm(minOfDay(v.check_out))}
                        </span>
                      ) : (
                        <StatusChip status="checked_in" label={t('staff.inside')} />
                      )}
                    </td>
                    <td className="whitespace-nowrap">{where(v)}</td>
                    <td className="whitespace-nowrap text-grey-ink">{t(`people.via_${v.via}`)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  )
}
