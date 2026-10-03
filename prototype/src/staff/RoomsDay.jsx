import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, usePersonName } from '../lib/hooks'
import { ACTIVE, dateOf, hoursFor, minOfDay, renter as findRenter } from '../lib/logic'
import { hm } from '../lib/time'
import Icon from '../components/Icon'
import { AvailabilityModal } from './BookFor'

// Same rules as the renter app: free time is white and time already gone has a see-through grey cover. Bookings are
// amber while awaiting, navy tint once confirmed, solid navy when the renter is in the room.
const BLOCK = {
  awaiting_confirmation: 'bg-amber/20 text-[#7a4f00] ring-amber/40',
  confirmed: 'bg-navy/[0.12] text-navy ring-navy/25',
  checked_in: 'bg-navy text-white ring-navy',
  used: 'bg-navy text-white ring-navy',
}

/**
 * Staff view of every room's opening day at once: one row per room, bookings as labelled blocks,
 * a "now" line, past time under a see-through grey cover. Click a booking to check its renter in.
 */
export default function RoomsDay() {
  const { t } = useTranslation()
  const pn = usePersonName()
  const L = useL()
  const navigate = useNavigate()
  const s = useStore()
  const date = dateOf(s.now)
  const h = hoursFor(s.data, date)
  // Width of the time track, so labels fit whatever the screen (the demo shows this dashboard scaled down).
  const track = useRef(null)
  const [width, setWidth] = useState(600)
  const [room, setRoom] = useState(null) // room whose photos and calendar are open
  const open = !!h
  useEffect(() => {
    const el = track.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])
  if (!h) return <p className="rounded-2xl bg-surface px-5 py-4 text-grey-ink">{t('common.closed')}</p>
  const span = h.close - h.open
  const pct = (m) => `${((m - h.open) / span) * 100}%`
  const perHour = (width / span) * 60
  const nowMin = minOfDay(s.now)
  const hours = []
  for (let m = Math.ceil(h.open / 60) * 60; m <= h.close; m += 60) hours.push(m)
  // Below ~48 px an hour, "08:00" labels touch: label every other hour.
  const labelled = perHour < 48 ? hours.filter((m) => (m - hours[0]) % 120 === 0) : hours

  return (
    <div className="rounded-[22px] bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-3 font-head text-[22px] font-bold tracking-tight">
          {t('staff.rooms_today')}
          <Link to="/s/book" className="btn-secondary !min-h-9 !px-3 font-body !text-[14px] tracking-normal">
            <Icon name="plus" size={16} />
            {t('staff_book.title')}
          </Link>
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-grey-ink">
          {['awaiting_confirmation', 'confirmed', 'checked_in'].map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`size-3 rounded-[4px] ring-1 ${BLOCK[k]}`} />
              {t(`status.${k}`)}
            </span>
          ))}
        </div>
      </div>

      {/* hour scale */}
      <div className="flex">
        <div className="w-28 shrink-0" />
        <div ref={track} className="relative h-5 flex-1" dir="ltr" aria-hidden="true">
          {labelled.map((m) => (
            <span key={m} className="absolute -translate-x-1/2 text-[12px] text-grey-ink tabular-nums" style={{ left: pct(m) }}>
              {hm(m)}
            </span>
          ))}
        </div>
      </div>

      <div className="divide-y divide-black/[0.06] overflow-visible rounded-2xl bg-white ring-1 ring-black/[0.06]">
        {s.data.spaces.map((sp) => {
          const bookings = s.data.bookings.filter((b) => b.space_id === sp.id && b.date === date && ACTIVE.includes(b.status))
          const down = sp.down && sp.down.date === date ? sp.down : null
          return (
            <div key={sp.id} className="flex items-stretch">
              <button
                onClick={() => setRoom(sp.id)}
                className="relative flex w-28 shrink-0 items-center gap-1 border-e border-black/[0.06] ps-4 pe-1 text-start hover:bg-black/[0.03]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold" title={L(sp.label)}>
                    {L(sp.short)}
                  </span>
                  <span className="block text-[12px] text-grey-ink">{t('map.people', { n: sp.capacity })}</span>
                </span>
              </button>

              <div className="relative h-16 flex-1" dir="ltr">
                {hours.map((m) => (
                  <span key={m} className="absolute inset-y-0 border-s border-black/[0.05]" style={{ left: pct(m) }} aria-hidden="true" />
                ))}
                {/* time already gone: a see-through grey cover over everything before now */}
                {nowMin > h.open && (
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 z-[5] bg-past"
                    style={{ width: pct(Math.min(nowMin, h.close)) }}
                    aria-hidden="true"
                  />
                )}
                {down && (
                  <div
                    className="hatch absolute inset-y-2 flex items-center overflow-hidden rounded-lg px-2 text-[12px] font-medium text-[#a32f2f] ring-1 ring-red/40"
                    style={{ left: pct(Math.max(down.from, h.open)), width: `calc(${pct(Math.min(down.to, h.close))} - ${pct(Math.max(down.from, h.open))})` }}
                    title={down.reason}
                  >
                    <span className="truncate">{down.reason}</span>
                  </div>
                )}
                {bookings.map((b) => {
                  const r = findRenter(s.data, b.renter_id)
                  // Fit the label to the block: name + times, name + start, or just the name (all of it is in the tooltip).
                  const px = ((b.end - b.start) / 60) * perHour
                  const narrow = px < 96
                  const tiny = px < 46
                  return (
                    <button
                      key={b.id}
                      onClick={() => navigate(`/s/checkin?renter=${r.id}`)}
                      className={`absolute inset-y-2 flex flex-col justify-center overflow-hidden rounded-lg text-start ring-1 hover:brightness-95 ${tiny ? 'px-0.5' : narrow ? 'px-1' : 'px-2'} ${BLOCK[b.status] || BLOCK.confirmed}`}
                      style={{ left: `calc(${pct(b.start)} + 1px)`, width: `calc(${pct(b.end)} - ${pct(b.start)} - 2px)` }}
                      title={`${pn(r)} · ${hm(b.start)}–${hm(b.end)} · ${t(`status.${b.status}`)}`}
                    >
                      <span
                        className={`truncate leading-tight font-semibold ${tiny ? 'text-[11px] tracking-tight' : narrow ? 'text-[12px] tracking-tight' : 'text-[13px]'}`}
                      >
                        {pn(r, true)}
                      </span>
                      {!tiny && <span className="truncate text-[12px] leading-tight opacity-80">{narrow ? hm(b.start) : `${hm(b.start)}–${hm(b.end)}`}</span>}
                    </button>
                  )
                })}
                {/* now line */}
                {nowMin >= h.open && nowMin <= h.close && (
                  <span
                    className="pointer-events-none absolute inset-y-0 z-[6] w-0.5 -translate-x-1/2 bg-teal"
                    style={{ left: pct(nowMin) }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-grey-ink">
        <Icon name="info" size={16} className="text-navy" />
        {t('staff.rooms_today_hint', { time: hm(nowMin) })}
      </p>
      {room && <AvailabilityModal id={room} onClose={() => setRoom(null)} />}
    </div>
  )
}
