import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { fmtDate, hm, weekdayName } from '../lib/time'
import { Card } from '../components/ui'
import { RoomPhoto } from '../components/RoomPhoto'
import { StaffTitle } from './StaffLayout'

/** S-10 Settings: rooms and hours (#1, #4) — read-only in the prototype */
export function RoomSettings() {
  const { t } = useTranslation()
  const L = useL()
  const s = useStore()
  return (
    <>
      <StaffTitle id="S-10" title={t('settings.rooms_title')} />
      <p className="mb-4 text-sm text-grey-ink">{t('settings.readonly')}</p>
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Card className="overflow-x-auto">
          <h2 className="mb-2 font-head text-xl font-bold">{t('settings.spaces')}</h2>
          <table className="w-full min-w-[600px] text-sm [&_td]:px-2.5 [&_td]:py-2.5 [&_td:first-child]:ps-0 [&_td:last-child]:pe-0 [&_th]:px-2.5 [&_th:first-child]:ps-0 [&_th:last-child]:pe-0">
            <thead className="text-[13px] text-grey-ink">
              <tr className="border-b border-black/[0.08]">
                {['name', 'zone', 'capacity', 'size', 'amenities', 'photos'].map((c) => (
                  <th key={c} className={`py-2 font-medium whitespace-nowrap ${c === 'capacity' || c === 'size' ? 'text-end' : 'text-start'}`}>
                    {t(`settings.col_${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black/[0.06] align-middle">
                <td className="font-medium whitespace-nowrap">{L(s.data.zones[0].name)}</td>
                <td>{t('settings.public')}</td>
                <td className="text-end tabular-nums">{s.data.seats.total}</td>
                <td className="text-end">—</td>
                <td>—</td>
                <td>—</td>
              </tr>
              {s.data.spaces.map((sp) => (
                <tr key={sp.id} className="border-b border-black/[0.06] align-middle last:border-0">
                  <td className="font-medium whitespace-nowrap">{L(sp.label)}</td>
                  <td className="whitespace-nowrap">{L(s.data.zones.find((z) => z.id === sp.zone_id).name)}</td>
                  <td className="text-end tabular-nums">{sp.capacity}</td>
                  <td className="text-end whitespace-nowrap tabular-nums">{sp.size_m2} m²</td>
                  <td>{sp.features.map((f) => t(`feature.${f}`)).join(', ')}</td>
                  <td>
                    <div className="flex gap-1">
                      {sp.photos.map((_, i) => (
                        <RoomPhoto key={i} space={sp} i={i} className="!w-12 !rounded-md" label={t('details.photo', { n: i + 1, room: L(sp.label) })} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="mt-5 mb-2 font-head text-xl font-bold">{t('settings.zone_rules')}</h2>
          <ul className="space-y-2 text-sm">
            {s.data.zones
              .filter((z) => z.rules.length)
              .map((z) => (
                <li key={z.id}>
                  <b>{L(z.name)}:</b> {z.rules.map((r) => L(r)).join(' · ')}
                </li>
              ))}
          </ul>
        </Card>
        <Card className="self-start">
          <h2 className="mb-2 font-head text-xl font-bold">{t('hours.title')}</h2>
          <table className="w-full text-sm">
            <tbody>
              {s.data.opening_hours.map((o) => (
                <tr key={o.weekday} className="border-b border-black/[0.06]">
                  <td className="py-1.5">{weekdayName(o.weekday, s.lang)}</td>
                  <td className="text-end" dir="ltr">
                    {o.open !== null ? `${hm(o.open)}–${hm(o.close)}` : t('common.closed')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="mt-4 mb-1 font-semibold">{t('hours.closed_days')}</h3>
          <ul className="text-sm">
            {s.data.closed_days.map((c) => (
              <li key={c.date}>
                {fmtDate(c.date, s.lang)} · {L(c.reason)}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
