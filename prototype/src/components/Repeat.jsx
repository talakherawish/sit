import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { REPEATS, defaultUntil } from '../lib/logic'
import { addDays, addMonths, fmtDate } from '../lib/time'
import { Chip, SectionLabel } from './ui'

/**
 * Repeat, all in one row: Weekly · Monthly · Until <date>. Tap a pattern to pick it, tap again to
 * unpick; nothing picked = no repeat. Picking a pattern fills in Until (a month ahead for weekly, six
 * for monthly) so it's never open-ended; tap Until to change the date. `first` is the earliest picked day.
 */
export default function RepeatPicker({ repeat, until, first, onChange }) {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const input = useRef(null)
  const year = first && until && until.slice(0, 4) !== first.slice(0, 4)
  const untilText = until ? fmtDate(until, lang, year ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }) : ''
  const pick = (k) => (repeat === k ? onChange({ repeat: null, until: null }) : onChange({ repeat: k, until: defaultUntil(first, k) }))
  return (
    <section>
      <SectionLabel>
        {t('repeat.title')} <span className="font-normal text-grey-ink">· {t('review.optional')}</span>
      </SectionLabel>
      {/* Faded (not crossed out) until there's a day to repeat */}
      <div className={`flex flex-wrap gap-2 ${first ? '' : 'pointer-events-none opacity-40'}`} aria-disabled={!first}>
        {REPEATS.map((k) => (
          <Chip key={k} active={repeat === k} onClick={() => pick(k)}>
            {t(`repeat.${k}`)}
          </Chip>
        ))}
        {/* The date input sits invisibly over the chip, so a tap opens the phone's own date picker */}
        <span className={`relative ${repeat ? '' : 'pointer-events-none opacity-50'}`}>
          <Chip active={!!repeat} onClick={() => input.current?.showPicker?.()}>
            {repeat ? t('repeat.until_date', { date: untilText }) : t('repeat.until')}
          </Chip>
          {repeat && (
            <input
              ref={input}
              type="date"
              aria-label={t('repeat.until_label')}
              className="absolute inset-0 cursor-pointer opacity-0"
              onClick={(e) => e.currentTarget.showPicker?.()}
              value={until || ''}
              min={addDays(first, 7)}
              max={addMonths(first, 12)}
              onChange={(e) => e.target.value && onChange({ repeat, until: e.target.value })}
            />
          )}
        </span>
      </div>
      {!repeat && <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{t('repeat.none_hint')}</p>}
    </section>
  )
}
