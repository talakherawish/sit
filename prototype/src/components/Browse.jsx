import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { hoursFor, dateOf, minOfDay } from '../lib/logic'
import { fmtDate, hm, floor30 } from '../lib/time'
import { Chip, Sheet, TimeGrid } from './ui'
import { DayStrip } from './Calendar'
import Icon from './Icon'

/** The date + time the map and list are showing. */
export function useWhen() {
  const when = useStore((s) => s.when)
  const now = useStore((s) => s.now)
  return when || { date: dateOf(now), min: minOfDay(now), isNow: true }
}

export function ModeChips({ headingId }) {
  const { t } = useTranslation()
  const L = useL()
  const modes = useStore((s) => s.data.work_modes)
  const mode = useStore((s) => s.mode)
  const set = useStore((s) => s.set)
  return (
    <div className="px-4">
      <h2 id={headingId} className="px-1 font-head text-[24px] font-bold tracking-tight">
        {t('home.how')}
      </h2>
      <p className="mb-3 px-1 text-[15px] text-grey-ink">{t('home.how_hint')}</p>
      <div className="fade-x no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {modes.map((m) => (
          <Chip key={m.id} active={mode === m.id} onClick={() => set({ mode: mode === m.id ? 'browse' : m.id, selected: null })}>
            {L(m.label)}
          </Chip>
        ))}
      </div>
    </div>
  )
}

export function WhenBar() {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const when = useWhen()
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center gap-2 px-4">
      <button onClick={() => setOpen(true)} className="flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-[15px] font-semibold text-ink">
        <span className={`size-2 rounded-full ${when.isNow ? 'live-dot bg-teal' : 'bg-navy'}`} />
        {when.isNow ? t('when.today_now') : `${fmtDate(when.date, lang)} · ${hm(when.min)}`}
      </button>
      <div className="flex-1" />
      <Link to="/r/filter" className="flex min-h-11 items-center gap-1.5 px-2 text-[15px] font-medium text-navy">
        <Icon name="search" size={18} />
        {t('when.find')}
      </Link>
      <WhenSheet open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function WhenSheet({ open, onClose }) {
  const { t } = useTranslation()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const set = useStore((s) => s.set)
  const cur = useWhen()
  const [date, setDate] = useState(cur.date)
  const [min, setMin] = useState(floor30(cur.min))
  const h = hoursFor(data, date)
  const times = []
  if (h) for (let m = h.open; m < h.close; m += 30) if (date !== dateOf(now) || m + 30 > minOfDay(now)) times.push(m)
  const apply = () => {
    set({ when: h ? { date, min: times.includes(min) ? min : times[0] } : null })
    onClose()
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('when.title')}
      subtitle={t('when.subtitle')}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-secondary"
            onClick={() => {
              set({ when: null })
              onClose()
            }}
          >
            {t('when.now')}
          </button>
          <button className="btn-primary" onClick={apply} disabled={!h}>
            {t('when.show')}
          </button>
        </div>
      }
    >
      <h3 className="mb-2 px-1 text-[15px] font-semibold">{t('when.day')}</h3>
      <div className="mb-5">
        <DayStrip value={date} onChange={setDate} />
      </div>
      <h3 className="mb-2.5 px-1 text-[15px] font-semibold">{t('when.time')}</h3>
      {h ? (
        <TimeGrid times={times} isActive={(m) => m === min} onPick={setMin} />
      ) : (
        <p className="rounded-2xl bg-surface px-4 py-3 text-grey-ink">{t('common.closed')}</p>
      )}
    </Sheet>
  )
}
