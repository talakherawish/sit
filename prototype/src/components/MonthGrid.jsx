import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { dateOf } from '../lib/logic'
import { addDays, addMonths, fmtDate, weekday } from '../lib/time'
import Icon from './Icon'

/**
 * A month you page through, one day picked at a time. `dots(date)` returns the dot classes to show
 * under a day (bookings, free time…), `disabled(date)` greys a day out, `describe(date)` adds to its
 * spoken label. Weeks start on Sunday.
 */
export default function MonthGrid({ value, onPick, dots = () => [], disabled = () => false, describe = () => '' }) {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const now = useStore((s) => s.now)
  const today = dateOf(now)
  const [cursor, setCursor] = useState(`${(value || today).slice(0, 8)}01`)
  const first = addDays(cursor, -weekday(cursor))
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i))

  return (
    <div className="rounded-2xl bg-surface p-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate px-1 text-[17px] font-semibold">{fmtDate(cursor, lang, { month: 'long', year: 'numeric' })}</span>
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="grid size-9 place-items-center rounded-full text-navy"
          aria-label={t('cal.prev')}
        >
          <Icon name="back" size={18} className="rtl:rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="grid size-9 place-items-center rounded-full text-navy"
          aria-label={t('cal.next')}
        >
          <Icon name="next" size={18} className="rtl:rotate-180" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[12px] font-medium text-grey-ink" aria-hidden="true">
        {days.slice(0, 7).map((d) => (
          <span key={d} className="pb-1">
            {fmtDate(d, lang, { weekday: lang === 'ar' ? 'short' : 'narrow' })}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d) => {
          const on = d === value
          const off = disabled(d)
          const extra = describe(d)
          return (
            <button
              key={d}
              type="button"
              disabled={off}
              onClick={() => onPick(d)}
              aria-pressed={on}
              aria-label={`${fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' })}${extra ? ` — ${extra}` : ''}`}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl disabled:opacity-30 ${d.slice(0, 7) !== cursor.slice(0, 7) ? 'opacity-40' : ''}`}
            >
              <span
                className={`grid size-9 place-items-center rounded-full text-[16px] ${on ? 'bg-navy font-semibold text-white' : d === today ? 'font-bold text-teal' : 'text-ink'}`}
              >
                {Number(d.slice(8))}
              </span>
              <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                {dots(d).map((c, i) => (
                  <span key={i} className={`size-1.5 rounded-full ${c}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
