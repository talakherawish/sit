import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { dateOf, hoursFor, minOfDay, stateAt } from '../lib/logic'
import { ceil30, hm } from '../lib/time'
import Icon from './Icon'

const ROW = 44 // px per half hour: Apple's minimum touch target

/** "1 h 30 min" style duration. */
export function useDuration() {
  const { t } = useTranslation()
  return (min) => {
    const h = Math.floor(min / 60)
    const m = min % 60
    return h && m ? t('timeline.dur_hm', { h, m }) : h ? t('timeline.dur_h', { h }) : t('timeline.dur_m', { m })
  }
}

/**
 * The room's whole opening day as a calendar column: booked, past and out-of-order stretches are
 * labelled blocks, free half-hours are tappable. Tap a free time to start; tap another free time
 * (earlier or later) to stretch the booking to it; tap inside the selection to end it there.
 */
export default function DayTimeline({ spaceId, date, range, onChange }) {
  const { t } = useTranslation()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const renterId = useStore((s) => s.renterId)
  const dur = useDuration()
  const [note, setNote] = useState(null)
  const h = hoursFor(data, date)
  if (!h) return <p className="rounded-2xl bg-surface px-4 py-3 text-grey-ink">{t('common.closed')}</p>

  const firstBookable = date === dateOf(now) ? Math.max(h.open, ceil30(minOfDay(now))) : h.open
  // Today, hide whole hours that have already gone so the list starts near now.
  const from = Math.max(h.open, Math.floor(firstBookable / 60) * 60)
  const slots = []
  for (let m = from; m < h.close; m += 30) {
    const st = stateAt(data, spaceId, date, m)
    if (st.state === 'booked') slots.push({ m, kind: st.booking.renter_id === renterId ? 'mine' : 'booked', key: st.booking.id })
    else if (st.state === 'down') slots.push({ m, kind: 'down', key: 'down' })
    else if (m < firstBookable) slots.push({ m, kind: 'past', key: 'past' })
    else slots.push({ m, kind: 'free', key: 'free' })
  }
  const blocks = []
  for (const s of slots) {
    const last = blocks[blocks.length - 1]
    if (last && last.key === s.key) last.to = s.m + 30
    else blocks.push({ key: s.key, kind: s.kind, from: s.m, to: s.m + 30 })
  }
  const isFreeSlot = (m) => slots.find((x) => x.m === m)?.kind === 'free'
  const allFree = (a, b) => {
    for (let m = a; m < b; m += 30) if (!isFreeSlot(m)) return false
    return true
  }

  const tap = (m) => {
    setNote(null)
    if (!range) return onChange({ start: m, end: m + 30 })
    if (m >= range.start && m < range.end) {
      if (range.end - range.start === 30) return onChange(null)
      return onChange({ start: range.start, end: m + 30 })
    }
    const start = Math.min(range.start, m)
    const end = Math.max(range.end, m + 30)
    if (allFree(start, end)) return onChange({ start, end })
    setNote(t('timeline.blocked', { time: hm(m) }))
    onChange({ start: m, end: m + 30 })
  }

  const top = (m) => ((m - from) / 30) * ROW
  const height = top(h.close)
  const hours = []
  for (let m = Math.ceil(from / 60) * 60; m <= h.close; m += 60) hours.push(m)
  const span = (a, b) => (
    <span dir="ltr">
      {hm(a)}–{hm(b)}
    </span>
  )

  const help = note ? note : !range ? t('timeline.tap_start') : range.end - range.start === 30 ? t('timeline.tap_end') : t('timeline.tap_inside')
  const BLOCK = {
    booked: 'bg-[#E4E6EB] text-ink/75',
    mine: 'bg-navy/10 text-navy',
    past: 'bg-past text-grey-ink',
    down: 'hatch text-[#a32f2f]',
  }

  return (
    <div>
      <div className="mb-3 flex min-h-[68px] items-center gap-3 rounded-2xl bg-navy/[0.06] px-4 py-2" aria-live="polite">
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold text-navy">
            {range ? (
              <>
                {span(range.start, range.end)} · {dur(range.end - range.start)}
              </>
            ) : (
              t('timeline.no_time')
            )}
          </span>
          <span className={`block text-[13px] ${note ? 'font-medium text-[#a32f2f]' : 'text-grey-ink'}`}>{help}</span>
        </span>
        {range && (
          <button type="button" className="min-h-11 shrink-0 px-1 text-[15px] font-medium text-navy" onClick={() => onChange(null)}>
            {t('timeline.clear')}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {/* hour labels */}
        <div className="relative w-11 shrink-0" style={{ height }} aria-hidden="true">
          {hours.map((m) => (
            <span key={m} className="absolute end-0 -translate-y-1/2 text-[12px] text-grey-ink tabular-nums" style={{ top: top(m) }} dir="ltr">
              {hm(m)}
            </span>
          ))}
        </div>

        <div className="relative flex-1 overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.08] ring-inset" style={{ height }}>
          {hours.map((m) => (
            <span key={m} className="absolute inset-x-0 border-t border-black/[0.07]" style={{ top: top(m) }} aria-hidden="true" />
          ))}

          {/* free half-hours */}
          {slots
            .filter((s) => s.kind === 'free')
            .map((s) => (
              <button
                type="button"
                key={s.m}
                onClick={() => tap(s.m)}
                className="absolute inset-x-0 active:bg-navy/10"
                style={{ top: top(s.m), height: ROW }}
                aria-pressed={!!range && s.m >= range.start && s.m < range.end}
                aria-label={t('timeline.free_slot', { from: hm(s.m), to: hm(s.m + 30) })}
              />
            ))}

          {/* labelled stretches */}
          {blocks.map((b) =>
            b.kind === 'free' ? (
              // Free time stays white, as in the rooms grid; taps go through to the half-hour buttons below
              <div
                key={`f${b.from}`}
                className="pointer-events-none absolute inset-x-1.5 flex items-start gap-1.5 overflow-hidden px-2.5 pt-[12px] text-[13px] font-medium text-[#2f5656]"
                style={{ top: top(b.from) + 2, height: top(b.to) - top(b.from) - 4 }}
              >
                <span className="mt-[6px] size-1.5 shrink-0 rounded-full bg-teal" />
                {t('timeline.free')} · {span(b.from, b.to)}
              </div>
            ) : (
              <div
                key={`${b.key}${b.from}`}
                // Past time is one solid block edge to edge; bookings are inset cards
                className={`absolute flex items-start gap-1.5 overflow-hidden px-2.5 pt-[12px] text-[13px] font-medium ${b.kind === 'past' ? 'inset-x-0' : 'inset-x-1.5 rounded-lg'} ${BLOCK[b.kind]}`}
                style={
                  b.kind === 'past' ? { top: top(b.from), height: top(b.to) - top(b.from) } : { top: top(b.from) + 2, height: top(b.to) - top(b.from) - 4 }
                }
              >
                {b.kind === 'booked' && <Icon name="lock" size={14} className="mt-[2px] shrink-0" />}
                <span className="truncate">
                  {t(`timeline.${b.kind}`)} · {span(b.from, b.to)}
                </span>
              </div>
            ),
          )}

          {range && (
            <div
              className="pointer-events-none absolute inset-x-1.5 flex items-start rounded-lg bg-navy px-2.5 pt-[12px] text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(36,80,143,0.35)]"
              style={{ top: top(range.start) + 2, height: top(range.end) - top(range.start) - 4 }}
            >
              <span>
                {span(range.start, range.end)} · {dur(range.end - range.start)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
