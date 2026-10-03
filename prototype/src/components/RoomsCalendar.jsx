import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { ACTIVE, dateOf, hoursFor, isFree, minOfDay } from '../lib/logic'
import { ceil30, hm } from '../lib/time'
import Icon from './Icon'

const ROW = 32 // px per half hour

/**
 * Every room's day at once, phone-first, in the style of Apple Calendar's day view: hours run down the
 * side, each room is a column, bookings are blocks and a line marks now. Tapping free time opens that
 * room's booking sheet with the time already picked; tapping a booking opens the room's day.
 */
export default function RoomsCalendar({ date, onPick, onMine }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const renterId = useStore((s) => s.renterId)
  const h = hoursFor(data, date)
  if (!h) return <p className="mx-4 rounded-2xl bg-surface px-4 py-3 text-grey-ink">{t('common.closed')}</p>

  const today = date === dateOf(now)
  const nowMin = minOfDay(now)
  const firstBookable = today ? Math.max(h.open, ceil30(nowMin)) : h.open
  // Today, start at the current hour so the list opens near now.
  const from = today ? Math.min(Math.max(h.open, Math.floor(nowMin / 60) * 60), h.close - 60) : h.open
  const y = (m) => ((m - from) / 30) * ROW
  const height = y(h.close)
  const hours = []
  for (let m = Math.ceil(from / 60) * 60; m <= h.close; m += 60) hours.push(m)
  const slots = []
  for (let m = from; m < h.close; m += 30) slots.push(m)

  const pick = (sp, m) => onPick(sp.id, { start: m, end: isFree(data, sp.id, date, m, m + 60) ? m + 60 : m + 30 })
  const BLOCK = {
    booked: 'bg-[#E4E6EB] text-ink/70',
    mine: 'bg-navy/15 text-navy',
    down: 'hatch text-[#a32f2f]',
  }

  return (
    <div>
      {/* Room names stay visible while the hours scroll; top-0 is already below the nav bar because sticky respects the page padding */}
      <div className="sticky top-0 z-10 flex border-b border-black/[0.08] bg-white/90 px-4 pt-1 pb-2 backdrop-blur-xl">
        <div className="w-11 shrink-0" />
        {data.spaces.map((sp) => (
          <button key={sp.id} onClick={() => onPick(sp.id, null)} className="min-w-0 flex-1 px-0.5 text-center">
            <span className="block text-[13px] leading-tight font-semibold">{L(sp.short)}</span>
            <span className="block text-[12px] text-grey-ink">{t('map.people', { n: sp.capacity })}</span>
          </button>
        ))}
      </div>

      <div className="flex px-4 pt-3">
        {/* hour gutter */}
        <div className="relative w-11 shrink-0" style={{ height }} aria-hidden="true">
          {hours.map((m) => (
            <span key={m} className="absolute end-1.5 -translate-y-1/2 text-[12px] text-grey-ink tabular-nums" style={{ top: y(m) }} dir="ltr">
              {hm(m)}
            </span>
          ))}
          {today && nowMin >= from && nowMin <= h.close && (
            <span
              className="absolute end-0.5 z-20 -translate-y-1/2 rounded-full bg-teal px-1.5 text-[12px] leading-5 font-semibold text-white tabular-nums"
              style={{ top: y(nowMin) }}
              dir="ltr"
            >
              {hm(nowMin)}
            </span>
          )}
        </div>

        <div className="relative flex flex-1" style={{ height }}>
          {/* hour lines across every column */}
          {hours.map((m) => (
            <span key={m} className="pointer-events-none absolute inset-x-0 z-[1] border-t border-black/[0.07]" style={{ top: y(m) }} aria-hidden="true" />
          ))}
          {/* time that has passed */}
          {today && firstBookable > from && (
            <span
              className="pointer-events-none absolute inset-x-0 top-0 bg-black/[0.035]"
              style={{ height: y(Math.min(firstBookable, h.close)) }}
              aria-hidden="true"
            />
          )}

          {data.spaces.map((sp) => {
            const down = sp.down && sp.down.date === date ? sp.down : null
            const bookings = data.bookings.filter((b) => b.space_id === sp.id && b.date === date && ACTIVE.includes(b.status))
            return (
              <div key={sp.id} className="relative min-w-0 flex-1 border-s border-black/[0.06]">
                {slots
                  .filter((m) => m >= firstBookable && isFree(data, sp.id, date, m, m + 30))
                  .map((m) => (
                    <button
                      key={m}
                      onClick={() => pick(sp, m)}
                      className="absolute inset-x-0.5 bg-free active:bg-navy/15"
                      style={{ top: y(m), height: ROW }}
                      aria-label={t('rooms_cal.free_at', { room: L(sp.label), time: hm(m) })}
                    />
                  ))}
                {down && (
                  <div
                    className={`absolute inset-x-0.5 overflow-hidden rounded-md px-1 pt-1 text-[12px] leading-tight font-medium ${BLOCK.down}`}
                    style={{ top: y(Math.max(down.from, from)) + 1, height: y(Math.min(down.to, h.close)) - y(Math.max(down.from, from)) - 2 }}
                  >
                    {t('timeline.down')}
                  </div>
                )}
                {bookings
                  .filter((b) => b.end > from)
                  .map((b) => {
                    const kind = b.renter_id === renterId ? 'mine' : 'booked'
                    const top = y(Math.max(b.start, from))
                    const tall = y(b.end) - top
                    return (
                      <button
                        key={b.id}
                        onClick={() => (kind === 'mine' && onMine ? onMine(b.id) : onPick(sp.id, null))}
                        className={`absolute inset-x-0.5 flex flex-col overflow-hidden rounded-md px-1 pt-1 text-start text-[12px] leading-tight ${BLOCK[kind]}`}
                        style={{ top: top + 1, height: tall - 2 }}
                        aria-label={`${L(sp.label)} · ${t(kind === 'mine' ? 'timeline.mine' : 'timeline.booked')} · ${hm(b.start)}–${hm(b.end)}`}
                      >
                        {/* Narrow columns: stack the times instead of a label; colour and the lock say what it is */}
                        {kind === 'mine' && <span className="truncate font-semibold">{t('rooms_cal.you')}</span>}
                        <span className="flex items-center gap-0.5 font-semibold tabular-nums" dir="ltr">
                          {kind === 'booked' && <Icon name="lock" size={11} className="shrink-0" />}
                          {hm(b.start)}
                        </span>
                        {tall >= ROW * (kind === 'mine' ? 2 : 1.5) && (
                          <span className="tabular-nums opacity-75" dir="ltr">
                            –{hm(b.end)}
                          </span>
                        )}
                      </button>
                    )
                  })}
              </div>
            )
          })}

          {/* now line */}
          {today && nowMin >= from && nowMin <= h.close && (
            <span className="pointer-events-none absolute inset-x-0 z-10 h-0.5 -translate-y-1/2 bg-teal" style={{ top: y(nowMin) }} aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  )
}

/** Key for the grid: the same "Free" colour as the map. */
export function RoomsLegend() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-2 px-1 text-[13px] whitespace-nowrap text-grey-ink">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-[4px] bg-free ring-1 ring-teal/40" />
        {t('legend.free')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-[4px] bg-[#E4E6EB]" />
        {t('legend.booked')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-[4px] bg-navy/15" />
        {t('rooms_cal.yours')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="hatch size-3 rounded-[4px]" />
        {t('legend.down')}
      </span>
    </div>
  )
}
