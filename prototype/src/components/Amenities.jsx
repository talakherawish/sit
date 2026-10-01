import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { amenityHoursFor, amenityStatus, dateOf } from '../lib/logic'
import { addDays, fmtDate, hm, weekday, weekdayName } from '../lib/time'
import { Sheet, StatusChip } from './ui'
import Icon from './Icon'

/** "Open · until 15:30" / "Closed · opens Sun 08:30" for an amenity right now. */
export function useAmenityLine() {
  const { t } = useTranslation()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const lang = useStore((s) => s.lang)
  return (a) => {
    const st = amenityStatus(data, a, now)
    if (st.open) return { open: true, text: t('amenity.open_until', { time: hm(st.until) }) }
    if (!st.next) return { open: false, text: t('amenity.closed') }
    const when = st.next.date === dateOf(now) ? hm(st.next.min) : `${fmtDate(st.next.date, lang, { weekday: 'short' })} ${hm(st.next.min)}`
    return { open: false, text: t('amenity.opens', { when }) }
  }
}

/** One tappable row for an amenity (icon, name, live open/closed line). */
export function AmenityRow({ a, onOpen }) {
  const L = useL()
  const line = useAmenityLine()(a)
  return (
    <button onClick={() => onOpen(a.id)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start active:bg-black/[0.04]">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-navy">
        <Icon name={a.icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px]">{L(a.name)}</span>
        <span className={`block text-[13px] ${line.open ? 'font-medium text-[#2f5656]' : 'text-grey-ink'}`}>{line.text}</span>
      </span>
      <Icon name="next" size={16} className="text-grey-ink/60 rtl:rotate-180" />
    </button>
  )
}

/** Grouped list of every amenity. */
export function AmenityList({ onOpen }) {
  const amenities = useStore((s) => s.data.amenities)
  return (
    <div className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
      {amenities.map((a) => (
        <AmenityRow key={a.id} a={a} onOpen={onOpen} />
      ))}
    </div>
  )
}

/** Detail sheet: status now, this week's hours, what's on offer. */
export function AmenitySheet({ id, onClose }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const lang = useStore((s) => s.lang)
  const line = useAmenityLine()
  const a = data.amenities.find((x) => x.id === id)
  if (!a) return null
  const st = line(a)
  const today = dateOf(now)
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  return (
    <Sheet open onClose={onClose} title={L(a.name)}>
      <p className="mb-1 flex items-center gap-2">
        <StatusChip status={st.open ? 'free' : 'released'} label={st.text} />
      </p>
      <p className="mb-4 text-[15px] text-grey-ink">{L(a.where)}</p>

      <h3 className="mb-1.5 px-1 text-[15px] font-semibold">{t('amenity.offers')}</h3>
      <ul className="mb-5 divide-y divide-black/[0.07] rounded-2xl bg-surface">
        {a.offers.map((o, k) => (
          <li key={k} className="flex min-h-11 items-center gap-3 px-4 text-[16px]">
            <Icon name="check" size={16} className="shrink-0 text-teal" />
            {L(o)}
          </li>
        ))}
      </ul>

      <h3 className="mb-1.5 px-1 text-[15px] font-semibold">{t('amenity.hours')}</h3>
      <ul className="divide-y divide-black/[0.07] rounded-2xl bg-surface">
        {week.map((d) => {
          const h = amenityHoursFor(data, a, d)
          return (
            <li key={d} className={`flex min-h-11 items-center justify-between px-4 text-[16px] ${d === today ? 'font-semibold' : ''}`}>
              <span>
                {d === today ? t('hours.today_cap') : weekdayName(weekday(d), lang)}
                <span className="ms-2 text-[13px] font-normal text-grey-ink">{fmtDate(d, lang, { day: 'numeric', month: 'short' })}</span>
              </span>
              <span className={h ? '' : 'text-grey-ink'} dir="ltr">
                {h ? `${hm(h.open)}–${hm(h.close)}` : t('common.closed')}
              </span>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
