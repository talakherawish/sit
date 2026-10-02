import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { amenityHoursFor, amenityStatus, dateOf, minOfDay, speedTests } from '../lib/logic'
import { addDays, fmtDate, hm, weekday, weekdayName } from '../lib/time'
import { Sheet, StatusChip } from './ui'
import Icon from './Icon'

/** "Open · until 15:30" / "Closed · opens Sun 08:30" for an amenity right now; Wi-Fi shows its last speed test. */
export function useAmenityLine() {
  const { t } = useTranslation()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const lang = useStore((s) => s.lang)
  return (a) => {
    const st = amenityStatus(data, a, now)
    if (st.open && a.speed_tests) {
      const last = speedTests(data, now)[0]
      if (last) return { open: true, text: t('amenity.speed_line', { down: last.down, up: last.up }) }
    }
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
        <span className={`block text-[13px] ${line.open ? 'font-medium text-[#2f5656]' : 'text-grey-ink'}`}>
          <bdi>{line.text}</bdi>
        </span>
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

/** Detail sheet: status now, what's on offer, this week's hours (and speed tests for Wi-Fi). */
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
    <Sheet open onClose={onClose} title={L(a.name)} subtitle={L(a.where)}>
      {a.speed_tests ? (
        <SpeedCard />
      ) : (
        <p className="mb-5">
          <StatusChip status={st.open ? 'free' : 'released'} label={st.text} />
        </p>
      )}

      <h3 className="mb-1.5 px-1 text-[15px] font-semibold">{t('amenity.offers')}</h3>
      <ul className="mb-5 divide-y divide-black/[0.07] rounded-2xl bg-surface">
        {a.offers.map((o, k) => (
          <li key={k} className="flex min-h-11 items-center gap-3 px-4 py-2 text-[16px]">
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

/** Latest Wi-Fi speed test, shown like a speed-test result, plus today's earlier tests. */
function SpeedCard() {
  const { t } = useTranslation()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const tests = speedTests(data, now)
  const last = tests[0]
  if (!last) return <p className="mb-5 rounded-2xl bg-surface px-4 py-3 text-[15px] text-grey-ink">{t('amenity.no_test')}</p>
  const quality = last.down >= 50 ? 'great' : last.down >= 15 ? 'ok' : 'poor'
  const max = Math.max(100, ...tests.map((x) => x.down))
  return (
    <>
      <div className="mb-5 rounded-[22px] bg-surface px-5 pt-4 pb-4">
        <p className="flex items-center gap-2 text-[13px] font-medium text-grey-ink">
          <span className={`size-2 rounded-full ${quality === 'poor' ? 'bg-red' : quality === 'ok' ? 'bg-amber' : 'bg-teal'}`} />
          {t(`amenity.quality_${quality}`)}
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="font-head text-[56px] leading-none font-bold tracking-tight tabular-nums">{last.down}</span>
          <span className="text-[17px] font-medium text-grey-ink">{t('amenity.download')}</span>
        </p>
        <div className="mt-4 grid grid-cols-2 border-t border-black/[0.08] pt-3">
          <p className="border-e border-black/[0.08] pe-3">
            <span className="block text-[13px] text-grey-ink">{t('amenity.upload')}</span>
            <span className="text-[20px] font-semibold tabular-nums" dir="ltr">
              {last.up} <span className="text-[13px] font-medium text-grey-ink">Mbps</span>
            </span>
          </p>
          <p className="ps-4">
            <span className="block text-[13px] text-grey-ink">{t('amenity.ping')}</span>
            <span className="text-[20px] font-semibold tabular-nums" dir="ltr">
              {last.ping} <span className="text-[13px] font-medium text-grey-ink">ms</span>
            </span>
          </p>
        </div>
        <p className="mt-3 text-[13px] text-grey-ink">{t('amenity.tested_at', { time: hm(minOfDay(last.time)) })}</p>
      </div>

      {tests.length > 1 && (
        <>
          <h3 className="mb-1.5 px-1 text-[15px] font-semibold">{t('amenity.tests_today')}</h3>
          <ul className="mb-5 divide-y divide-black/[0.07] rounded-2xl bg-surface">
            {tests.map((x) => (
              <li key={x.time} className="flex min-h-11 items-center gap-3 px-4 text-[15px]">
                <span className="w-12 text-grey-ink tabular-nums" dir="ltr">
                  {hm(minOfDay(x.time))}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]" dir="ltr" aria-hidden="true">
                  <span className={`block h-full rounded-full ${x.down < 15 ? 'bg-red' : 'bg-teal'}`} style={{ width: `${(x.down / max) * 100}%` }} />
                </span>
                <span className="w-24 text-end font-medium tabular-nums" dir="ltr">
                  {x.down} <span className="text-[13px] font-normal text-grey-ink">Mbps</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
