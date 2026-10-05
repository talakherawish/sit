import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { dateOf, hoursFor, isFree, minOfDay } from '../lib/logic'
import { addDays, ceil30, fmtDate } from '../lib/time'
import DayTimeline, { useDuration } from './DayTimeline'
import MonthGrid from './MonthGrid'
import { SectionLabel } from './ui'

/** Free minutes left in a room on a day (today: from now on). */
export function freeMinutes(data, id, date, now) {
  const h = hoursFor(data, date)
  if (!h) return 0
  let n = 0
  for (let m = date === dateOf(now) ? Math.max(h.open, ceil30(minOfDay(now))) : h.open; m + 30 <= h.close; m += 30)
    if (isFree(data, id, date, m, m + 30)) n += 30
  return n
}

/**
 * One room's availability: a month calendar where free days are left plain and only busy days get a
 * dot (amber = under an hour left, grey = fully booked) and the picked day's bookings as a timeline. Room details (R-03)
 * lets you pick a time on it; reception's "See availability" shows it `readOnly`.
 */
export default function RoomAvailability({ id, day, onDay, range, onRange, readOnly }) {
  const { t } = useTranslation()
  const dur = useDuration()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const lang = useStore((s) => s.lang)
  const today = dateOf(now)
  const last = addDays(today, 60)
  const shut = (d) => !hoursFor(data, d)
  const closed = (d) => d < today || d > last || shut(d)
  const dot = (d) => {
    if (closed(d)) return []
    const n = freeMinutes(data, id, d, now)
    // A free day gets no dot; only days that are filling up or full are marked
    return n >= 60 ? [] : [n > 0 ? 'bg-amber' : 'bg-grey/40']
  }
  return (
    <>
      <section>
        <SectionLabel>{t('details.availability')}</SectionLabel>
        <MonthGrid
          value={day}
          onPick={onDay}
          disabled={closed}
          closed={shut}
          dots={dot}
          describe={(d) => {
            if (closed(d)) return t('common.closed')
            const n = freeMinutes(data, id, d, now)
            return n ? t('details.free_left', { time: dur(n) }) : t('details.full')
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] text-grey-ink">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-amber" />
            {t('details.legend_little')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-grey/40" />
            {t('details.full')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-grey-ink/60 line-through">9</span>
            {t('common.closed')}
          </span>
        </div>
      </section>
      <section className="mt-6">
        <SectionLabel>{fmtDate(day, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</SectionLabel>
        <DayTimeline spaceId={id} date={day} range={range} onChange={onRange} readOnly={readOnly} />
      </section>
    </>
  )
}
