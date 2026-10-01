import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { dateOf, hoursFor, isFree } from '../lib/logic'
import { addDays, dateToDay, fmtDate, weekday } from '../lib/time'
import { Segmented } from './ui'
import Icon from './Icon'

const HORIZON = 60 // days ahead you can book

const monthStart = (date) => `${date.slice(0, 8)}01`
const weekStart = (date) => addDays(date, -weekday(date)) // weeks start on Sunday
const sameMonth = (a, b) => a.slice(0, 7) === b.slice(0, 7)

/**
 * Multi-day picker with Week / Month views. Each open day shows whether the room is free
 * at the chosen time, so people can pick several days at once.
 */
export default function CalendarPicker({ spaceId, start, end, selected, focus, onToggle }) {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const today = dateOf(now)
  const last = addDays(today, HORIZON)
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(focus || today)

  const first = view === 'month' ? weekStart(monthStart(cursor)) : weekStart(cursor)
  const count = view === 'month' ? 42 : 7
  const days = Array.from({ length: count }, (_, i) => addDays(first, i))
  const step = (dir) => {
    if (view === 'week') return setCursor(addDays(cursor, dir * 7))
    const d = new Date(dateToDay(monthStart(cursor)) * 86400000)
    d.setUTCMonth(d.getUTCMonth() + dir)
    setCursor(d.toISOString().slice(0, 10))
  }
  const canBack = view === 'month' ? monthStart(cursor) > monthStart(today) : weekStart(cursor) > weekStart(today)
  const canFwd = view === 'month' ? monthStart(addDays(monthStart(cursor), 32)) <= last : addDays(weekStart(cursor), 7) <= last
  const title =
    view === 'month'
      ? fmtDate(cursor, lang, { month: 'long', year: 'numeric' })
      : `${fmtDate(days[0], lang, { day: 'numeric', month: 'short' })} – ${fmtDate(days[6], lang, { day: 'numeric', month: 'short' })}`

  return (
    <div className="rounded-2xl bg-surface p-3">
      <div className="mb-3 flex items-center gap-2">
        <Segmented
          className="w-40"
          label={t('cal.view')}
          value={view}
          onChange={(v) => {
            setView(v)
            setCursor(focus || today)
          }}
          options={[
            ['week', t('cal.week')],
            ['month', t('cal.month')],
          ]}
        />
        <span className="min-w-0 flex-1 truncate text-end text-[15px] font-semibold">{title}</span>
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={!canBack}
          className="grid size-9 place-items-center rounded-full text-navy disabled:opacity-30"
          aria-label={t('cal.prev')}
        >
          <Icon name="back" size={18} className="rtl:rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={!canFwd}
          className="grid size-9 place-items-center rounded-full text-navy disabled:opacity-30"
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
      <div className="grid grid-cols-7 gap-y-1" role="grid" aria-label={title}>
        {days.map((d) => {
          const outside = view === 'month' && !sameMonth(d, cursor)
          const h = hoursFor(data, d)
          const disabled = d < today || d > last || !h
          const free = !disabled && start !== null && end !== null && isFree(data, spaceId, d, start, end)
          const on = selected.includes(d)
          const isFocus = focus === d
          return (
            <button
              type="button"
              key={d}
              disabled={disabled}
              onClick={() => onToggle(d)}
              aria-pressed={on}
              aria-label={`${fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' })} — ${
                !h ? t('common.closed') : disabled ? t('cal.unavailable') : free ? t('cal.free') : t('cal.taken')
              }`}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl ${view === 'week' ? 'min-h-16' : 'min-h-11'} ${outside ? 'opacity-40' : ''} disabled:opacity-30`}
            >
              <span
                className={`grid size-9 place-items-center rounded-full text-[16px] ${
                  on ? 'bg-navy font-semibold text-white' : d === today ? 'font-bold text-orange' : 'text-ink'
                } ${isFocus && on ? 'ring-2 ring-navy/30 ring-offset-2 ring-offset-surface' : ''}`}
              >
                {Number(d.slice(8))}
              </span>
              {view === 'week' ? (
                <span className={`text-[12px] ${!h ? 'text-grey-ink' : free ? 'font-medium text-[#2f5656]' : 'text-grey-ink'}`}>
                  {!h ? t('common.closed') : disabled ? '' : free ? t('cal.free') : t('cal.taken')}
                </span>
              ) : (
                <span className={`size-1.5 rounded-full ${disabled ? 'bg-transparent' : free ? 'bg-teal' : 'bg-grey/50'}`} aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-4 px-1 text-[12px] text-grey-ink">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-teal" />
          {t('cal.free_at_time')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-grey/50" />
          {t('cal.taken')}
        </span>
      </div>
    </div>
  )
}

/** Horizontal strip of the next two weeks, for viewing free times on a day other than today. */
export function DayStrip({ value, onChange, days = 14 }) {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const today = dateOf(now)
  return (
    <div className="fade-x no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1" role="listbox" aria-label={t('cal.pick_day')}>
      {Array.from({ length: days }, (_, i) => addDays(today, i)).map((d) => {
        const closed = !hoursFor(data, d)
        const on = d === value
        return (
          <button
            type="button"
            key={d}
            role="option"
            aria-selected={on}
            disabled={closed}
            onClick={() => onChange(d)}
            aria-label={`${fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' })}${closed ? ` — ${t('common.closed')}` : ''}`}
            className={`flex min-h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ${
              on ? 'bg-ink text-white' : 'bg-surface text-ink'
            } disabled:bg-transparent disabled:text-grey-ink/50`}
          >
            <span className={`text-[12px] ${on ? 'text-white/80' : 'text-grey-ink'}`}>
              {d === today ? t('cal.today') : fmtDate(d, lang, { weekday: 'short' })}
            </span>
            <span className="text-[18px] font-semibold">{Number(d.slice(8))}</span>
          </button>
        )
      })}
    </div>
  )
}
