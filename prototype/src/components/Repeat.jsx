import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { REPEATS, repeatEnd } from '../lib/logic'
import { addDays, addMonths, fmtDate } from '../lib/time'
import { Chip, SectionLabel } from './ui'

/**
 * Repeat, chosen straight away: Just these days · 2 weeks · 1 month · Until… (no "Repeat? yes/no" step).
 * Repeats every picked weekday once a week. `first` is the earliest picked day.
 */
export default function RepeatPicker({ repeat, until, first, onChange }) {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const end = first ? repeatEnd(first, repeat, until) : null
  return (
    <section>
      <SectionLabel>{t('repeat.title')}</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {REPEATS.map((k) => (
          <Chip
            key={k}
            active={repeat === k}
            disabled={!first && k !== 'none'}
            onClick={() => onChange({ repeat: k, until: k === 'until' ? until || (first && addMonths(first, 1)) : until })}
          >
            {t(`repeat.${k}`)}
          </Chip>
        ))}
      </div>
      {repeat === 'until' && first && (
        <label className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl bg-surface px-4">
          <span className="text-[17px]">{t('repeat.until_label')}</span>
          <input
            type="date"
            aria-label={t('repeat.until_label')}
            className="min-h-11 flex-1 bg-transparent text-end text-[17px] text-navy outline-none"
            value={until || ''}
            min={addDays(first, 7)}
            max={addMonths(first, 12)}
            onChange={(e) => onChange({ repeat, until: e.target.value || null })}
          />
        </label>
      )}
      {end && <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{t('repeat.every_week_until', { date: fmtDate(end, lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) })}</p>}
    </section>
  )
}
