import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, usePersonName } from '../lib/hooks'
import { ACTIVE, dateOf, hoursFor, minOfDay, renter as findRenter } from '../lib/logic'
import { ceil30, hm } from '../lib/time'
import Icon from '../components/Icon'

// Booking colours by state: awaiting = amber, confirmed = navy, checked in = teal.
const BLOCK = {
  awaiting_confirmation: 'bg-amber/20 text-[#7a4f00] ring-amber/40',
  confirmed: 'bg-navy/[0.12] text-navy ring-navy/25',
  checked_in: 'bg-teal/20 text-[#2f5656] ring-teal/40',
  used: 'bg-teal/20 text-[#2f5656] ring-teal/40',
}

/**
 * Staff view of every room's opening day at once: one row per room, bookings as labelled blocks,
 * a "now" line, past time shaded. Click a booking to check its renter in; click free time to book for someone.
 */
export default function RoomsDay() {
  const { t } = useTranslation()
  const pn = usePersonName()
  const L = useL()
  const navigate = useNavigate()
  const s = useStore()
  const [menu, setMenu] = useState(null)
  const date = dateOf(s.now)
  const h = hoursFor(s.data, date)
  if (!h) return <p className="rounded-2xl bg-surface px-5 py-4 text-grey-ink">{t('common.closed')}</p>
  const span = h.close - h.open
  const pct = (m) => `${((m - h.open) / span) * 100}%`
  const nowMin = minOfDay(s.now)
  const hours = []
  for (let m = Math.ceil(h.open / 60) * 60; m <= h.close; m += 60) hours.push(m)
  const bookFrom = (spId, m) => navigate(`/s/book-for?space=${spId}&date=${date}&start=${m}`)

  return (
    <div className="rounded-[22px] bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-head text-[22px] font-bold tracking-tight">{t('staff.rooms_today')}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-grey-ink">
          {['awaiting_confirmation', 'confirmed', 'checked_in'].map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`size-3 rounded-[4px] ring-1 ${BLOCK[k]}`} />
              {t(`status.${k}`)}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="hatch size-3 rounded-[4px] ring-1 ring-red/40" />
            {t('timeline.down')}
          </span>
        </div>
      </div>

      {/* hour scale */}
      <div className="flex">
        <div className="w-40 shrink-0" />
        <div className="relative h-5 flex-1" dir="ltr" aria-hidden="true">
          {hours.map((m) => (
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
          const free = []
          for (let m = ceil30(Math.max(h.open, nowMin)); m < h.close; m += 30) {
            const taken = bookings.some((b) => m < b.end && m + 30 > b.start) || (down && m < down.to && m + 30 > down.from)
            if (!taken) free.push(m)
          }
          return (
            <div key={sp.id} className="flex items-stretch">
              <div className="relative flex w-40 shrink-0 items-center gap-1 border-e border-black/[0.06] ps-4 pe-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold" title={L(sp.label)}>
                    {L(sp.short)}
                  </span>
                  <span className="block text-[12px] text-grey-ink">{t('map.people', { n: sp.capacity })}</span>
                </span>
                <button
                  className="grid size-9 shrink-0 place-items-center rounded-full text-navy hover:bg-black/[0.05]"
                  onClick={() => setMenu(menu === sp.id ? null : sp.id)}
                  aria-label={t('staff.room_menu')}
                  aria-expanded={menu === sp.id}
                >
                  ⋯
                </button>
                {menu === sp.id && (
                  <div className="absolute start-24 top-11 z-20 w-52 rounded-xl bg-white p-1 shadow-xl ring-1 ring-black/[0.08]">
                    {sp.down ? (
                      <button
                        className="block min-h-11 w-full rounded-lg px-3 text-start hover:bg-black/[0.04]"
                        onClick={() => {
                          s.markRoomUp(sp.id)
                          setMenu(null)
                        }}
                      >
                        {t('staff.mark_up')}
                      </button>
                    ) : (
                      <button
                        className="block min-h-11 w-full rounded-lg px-3 text-start text-[#a32f2f] hover:bg-black/[0.04]"
                        onClick={() => navigate(`/s/room-down?space=${sp.id}`)}
                      >
                        {t('staff.mark_down')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="relative h-16 flex-1" dir="ltr">
                {hours.map((m) => (
                  <span key={m} className="absolute inset-y-0 border-s border-black/[0.05]" style={{ left: pct(m) }} aria-hidden="true" />
                ))}
                {/* past time */}
                {nowMin > h.open && (
                  <span className="absolute inset-y-0 left-0 bg-black/[0.035]" style={{ width: pct(Math.min(nowMin, h.close)) }} aria-hidden="true" />
                )}
                {/* free half-hours: click to book for someone */}
                {free.map((m) => (
                  <button
                    key={m}
                    className="absolute inset-y-1 rounded-md hover:bg-navy/[0.07]"
                    style={{ left: pct(m), width: `${(30 / span) * 100}%` }}
                    onClick={() => bookFrom(sp.id, m)}
                    aria-label={t('staff.book_slot', { room: L(sp.label), time: hm(m) })}
                    title={t('staff.book_slot', { room: L(sp.label), time: hm(m) })}
                  />
                ))}
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
                  return (
                    <button
                      key={b.id}
                      onClick={() => navigate(`/s/checkin?renter=${r.id}`)}
                      className={`absolute inset-y-2 flex flex-col justify-center overflow-hidden rounded-lg px-2 text-start ring-1 hover:brightness-95 ${BLOCK[b.status] || BLOCK.confirmed}`}
                      style={{ left: `calc(${pct(b.start)} + 1px)`, width: `calc(${pct(b.end)} - ${pct(b.start)} - 2px)` }}
                      title={`${pn(r)} · ${hm(b.start)}–${hm(b.end)} · ${t(`status.${b.status}`)}`}
                    >
                      <span className="truncate text-[13px] leading-tight font-semibold">{pn(r, true)}</span>
                      <span className="truncate text-[12px] leading-tight opacity-80">
                        {hm(b.start)}–{hm(b.end)}
                      </span>
                    </button>
                  )
                })}
                {/* now line */}
                {nowMin >= h.open && nowMin <= h.close && (
                  <span className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-teal" style={{ left: pct(nowMin) }} aria-hidden="true" />
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
    </div>
  )
}
