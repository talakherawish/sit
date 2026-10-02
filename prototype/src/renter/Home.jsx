import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useRequireLogin } from '../lib/hooks'
import { activeNotices, dayBlocks, freeStarts, hoursFor, stateAt, nextFreeAt, dateOf, minOfDay, speedTests } from '../lib/logic'
import { hm } from '../lib/time'
import FloorPlan from '../components/FloorPlan'
import { DayStrip } from '../components/Calendar'
import { AmenitySheet, useAmenityLine } from '../components/Amenities'
import { MapListSwitch, ModeChips, WhenBar, useWhen } from '../components/Browse'
import { Photo, ScreenId, Sheet, TimeGrid } from '../components/ui'
import Icon, { TechnoparkLogo } from '../components/Icon'

/** R-01 Home: interactive floor plan (landing page) */
export default function Home() {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const mode = useStore((s) => s.mode)
  const selected = useStore((s) => s.selected)
  const set = useStore((s) => s.set)
  const lang = useStore((s) => s.lang)
  const renterId = useStore((s) => s.renterId)
  const when = useWhen()
  const [sheet, setSheet] = useState(null) // 'notices' | 'about' | zone id for rules | null
  const [roomSheet, setRoomSheet] = useState(null)

  // "Show on map" from R-02 lands here with a room selected — open its sheet.
  useEffect(() => {
    if (selected) setRoomSheet(selected)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSelect = (id) => {
    set({ selected: id })
    setRoomSheet(id)
  }

  const h = hoursFor(data, dateOf(now))
  const notices = activeNotices(data, now)
  const latest = notices[0]
  const { taken, total } = data.seats
  const me = data.renters.find((r) => r.id === renterId)
  const min = minOfDay(now)
  const part = min < 12 * 60 ? 'morning' : min < 17 * 60 ? 'afternoon' : 'evening'

  return (
    <div className="space-y-7 px-4 pt-3">
      <header className="px-1 pt-2">
        <h1 className="font-head text-[34px] leading-[1.1] font-bold tracking-tight">
          {t(`home.greeting_${part}`)}
          {me && (
            <span className="text-grey-ink">
              {lang === 'ar' ? '، ' : ', '}
              {me.name.split(' ')[0]}
            </span>
          )}
        </h1>
        <ScreenId id="R-01" className="mt-1" />
      </header>

      {/* Live seats (US-1 AC1) + hours + latest notice (US-1 AC2) */}
      <section className="overflow-hidden rounded-[26px] bg-surface" aria-label={t('home.todays_status')}>
        <button onClick={() => onSelect('public')} className="block w-full px-5 pt-4 pb-4 text-start" aria-label={t('home.seats_aria', { taken, total })}>
          <span className="flex items-center gap-2 text-[13px] font-medium text-grey-ink">
            <span className="live-dot size-2 rounded-full bg-orange" />
            {t('home.live')} · {L(data.zones[0].name)}
          </span>
          <span className="mt-1 flex items-end gap-2">
            <span className="flex items-baseline gap-1.5" dir="ltr">
              <span className="font-head text-[64px] leading-none font-bold tracking-tight">{taken}</span>
              <span className="font-head text-[26px] font-semibold text-grey-ink">/ {total}</span>
            </span>
            <span className="ms-auto pb-1.5 text-end text-[15px] leading-snug text-grey-ink">
              {t('home.seats_taken')}
              <br />
              <span className="font-semibold text-[#2f5656]">{t('home.seats_free', { count: total - taken })}</span>
            </span>
          </span>
          {/* one tick per seat */}
          <span className="mt-3 flex h-6 items-end gap-[3px]" dir="ltr" aria-hidden="true">
            {Array.from({ length: total }, (_, k) => (
              <span key={k} className={`flex-1 rounded-full transition-all ${k < taken ? 'h-full bg-orange' : 'h-2.5 bg-black/[0.09]'}`} />
            ))}
          </span>
        </button>
        <div className="divide-y divide-black/[0.07] border-t border-black/[0.07]">
          <Link to="/r/hours" className="flex min-h-12 items-center gap-3 px-5 text-[15px]">
            <Icon name="clock" size={18} className="text-navy" />
            <span className="flex-1">{h ? t('home.open') : t('home.closed_today')}</span>
            {h && (
              <span className="text-grey-ink" dir="ltr">
                {hm(h.open)}–{hm(h.close)}
              </span>
            )}
            <Icon name="next" size={16} className="text-grey-ink/60 rtl:rotate-180" />
          </Link>
          <CafeteriaRow onOpen={onSelect} />
          <WifiRow onOpen={onSelect} />
          {latest && (
            <button onClick={() => setSheet('notices')} className="flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-start text-[15px]">
              <Icon name="megaphone" size={18} className="shrink-0 text-orange" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{L(latest.text)}</span>
                <span className="text-[13px] text-grey-ink">
                  {t('home.posted', { time: hm(minOfDay(latest.posted_at)) })} · {t('home.n_notices', { count: notices.length })}
                </span>
              </span>
              <Icon name="next" size={16} className="shrink-0 text-grey-ink/60 rtl:rotate-180" />
            </button>
          )}
        </div>
      </section>

      <section className="-mx-4 space-y-3">
        <ModeChips />
        <WhenBar />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="font-head text-[24px] font-bold tracking-tight">{t('home.floor_plan')}</h2>
          <MapListSwitch active="map" />
        </div>
        <FloorPlan date={when.date} min={when.min} mode={mode} selected={selected} onSelect={onSelect} hint={t('home.map_hint')} />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[13px] text-grey-ink">
          <Legend swatch="bg-[#DCE8E8] border-teal" label={t('legend.free')} />
          <Legend swatch="bg-[#D5DCDC] border-grey" label={t('legend.booked')} lock />
          <Legend swatch="bg-white border-orange border-2" label={t('legend.match')} />
          <Legend swatch="hatch border-red" label={t('legend.down')} />
        </div>
        <div className="fade-x no-scrollbar -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-5">
          <span className="shrink-0 text-[15px] font-semibold">{t('home.zone_rules')}</span>
          {data.zones
            .filter((z) => z.rules.length)
            .map((z) => (
              <button
                key={z.id}
                onClick={() => setSheet(z.id)}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[15px]"
              >
                <Icon name="info" size={16} className="text-navy" /> {L(z.name)}
              </button>
            ))}
        </div>
      </section>

      <RoomsToday />

      {/* Future scope */}
      <section className="rounded-[22px] border border-dashed border-black/15 px-5 py-4 text-grey-ink" aria-disabled="true">
        <p className="text-[15px] font-semibold text-ink">{t('home.coming_soon')}</p>
        <p className="mt-1 text-[15px]">{t('home.coming_soon_body')}</p>
      </section>

      <button onClick={() => setSheet('about')} className="mx-auto block min-h-11 px-4 text-[13px] text-grey-ink">
        Technopark · Palestine
      </button>

      <Sheet
        open={sheet === 'notices'}
        onClose={() => setSheet(null)}
        title={t('home.todays_status')}
        subtitle={t('home.n_notices', { count: notices.length })}
      >
        <ul className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
          {notices.map((n) => (
            <li key={n.id} className="flex gap-3 px-4 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-orange">
                <Icon name={NOTICE_ICON[n.tag] || 'megaphone'} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] leading-snug">{L(n.text)}</span>
                <span className="mt-0.5 block text-[13px] text-grey-ink">
                  {t(`tag.${n.tag}`)} · {t('home.posted', { time: hm(minOfDay(n.posted_at)) })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Sheet>
      {data.zones.map((z) => (
        <Sheet key={z.id} open={sheet === z.id} onClose={() => setSheet(null)} title={t('home.rules_for', { zone: L(z.name) })}>
          <RulesList rules={z.rules} />
        </Sheet>
      ))}
      <Sheet open={sheet === 'about'} onClose={() => setSheet(null)} title={t('about.title')}>
        <TechnoparkLogo />
        <p className="mt-4 text-[17px]">{t('about.body')}</p>
        <p className="mt-3 font-head text-[22px] leading-snug font-semibold tracking-tight text-navy">“{t('about.vision')}”</p>
      </Sheet>
      {data.amenities.some((a) => a.id === roomSheet) ? (
        <AmenitySheet id={roomSheet} onClose={() => setRoomSheet(null)} />
      ) : (
        <RoomSheet id={roomSheet} onClose={() => setRoomSheet(null)} onJump={onSelect} />
      )}
    </div>
  )
}

function CafeteriaRow({ onOpen }) {
  const L = useL()
  const cafe = useStore((s) => s.data.amenities.find((a) => a.id === 'cafeteria'))
  const line = useAmenityLine()(cafe)
  return (
    <button onClick={() => onOpen('cafeteria')} className="flex min-h-12 w-full items-center gap-3 px-5 text-start text-[15px]">
      <Icon name="cup" size={18} className="text-navy" />
      <span className="flex-1">{L(cafe.name)}</span>
      <span className={line.open ? 'font-medium text-[#2f5656]' : 'text-grey-ink'}>{line.text}</span>
      <Icon name="next" size={16} className="text-grey-ink/60 rtl:rotate-180" />
    </button>
  )
}

/** Last Wi-Fi speed test, like a speed-test app: ↓ download · ↑ upload. */
function WifiRow({ onOpen }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const last = speedTests(data, now)[0]
  return (
    <button onClick={() => onOpen('wifi')} className="flex min-h-12 w-full items-center gap-3 px-5 text-start text-[15px]">
      <Icon name="wifi" size={18} className="text-navy" />
      <span className="flex-1">{L(data.amenities.find((a) => a.id === 'wifi').name)}</span>
      {last ? (
        <span className="flex items-baseline gap-2.5 tabular-nums" dir="ltr">
          <span className="font-medium text-[#2f5656]">↓ {last.down}</span>
          <span className="text-grey-ink">↑ {last.up}</span>
          <span className="text-[13px] text-grey-ink">Mbps</span>
        </span>
      ) : (
        <span className="text-grey-ink">{t('amenity.no_test')}</span>
      )}
      <Icon name="next" size={16} className="text-grey-ink/60 rtl:rotate-180" />
    </button>
  )
}

function Legend({ swatch, label, lock }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`relative inline-block size-3.5 rounded-[4px] border ${swatch}`}>
        {lock && <span className="absolute -end-1 -top-1 size-2 rounded-full bg-ink" />}
      </span>
      {label}
    </span>
  )
}

/** Free / Booked blocks per room for the rest of today (US-1 AC3), as one inset grouped list. */
function RoomsToday() {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const date = dateOf(now)
  const h = hoursFor(data, date)
  if (!h) return null
  const from = Math.max(h.open, Math.floor(minOfDay(now) / 30) * 30)
  const span = h.close - from
  if (span <= 0) return null
  const summary = (blocks, close) => {
    const [first, second] = blocks
    if (first.state === 'free') return first.to === close ? t('home.free_rest') : t('home.free_until', { time: hm(first.to) })
    const key = first.state === 'down' ? 'home.down_until' : 'home.booked_until'
    return second ? t(`${key}_then`, { time: hm(first.to) }) : t(key, { time: hm(first.to) })
  }
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="font-head text-[24px] font-bold tracking-tight">{t('home.rooms_today')}</h2>
        <span className="text-[13px] text-grey-ink" dir="ltr">
          {hm(from)} → {hm(h.close)}
        </span>
      </div>
      <div className="divide-y divide-black/[0.07] overflow-hidden rounded-[22px] bg-surface">
        {data.spaces.map((sp) => {
          const blocks = dayBlocks(data, sp.id, date, from)
          const state = blocks[0].state
          return (
            <Link key={sp.id} to={`/r/room/${sp.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-black/[0.03]">
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[17px] font-semibold">{L(sp.label)}</span>
                  <span className="text-[13px] text-grey-ink">{t('map.people', { n: sp.capacity })}</span>
                </span>
                <span className="mt-2 flex h-1.5 gap-[2px] overflow-hidden rounded-full" dir="ltr" aria-hidden="true">
                  {blocks.map((b, k) => (
                    <span
                      key={k}
                      style={{ width: `${((b.to - b.from) / span) * 100}%` }}
                      className={b.state === 'free' ? 'bg-teal/40' : b.state === 'down' ? 'hatch bg-white' : 'bg-ink/70'}
                    />
                  ))}
                </span>
                <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-[13px]">
                  <span className={`font-semibold ${state === 'free' ? 'text-[#2f5656]' : state === 'down' ? 'text-[#a32f2f]' : 'text-ink'}`}>
                    {summary(blocks, h.close)}
                  </span>
                  {blocks.some((b) => b.state !== 'free') && (
                    <span className="text-grey-ink">
                      {t('home.taken_times')}{' '}
                      <span dir="ltr">
                        {blocks
                          .filter((b) => b.state !== 'free')
                          .map((b) => `${hm(b.from)}–${hm(b.to)}`)
                          .join(', ')}
                      </span>
                    </span>
                  )}
                </span>
              </span>
              <Icon name="next" size={16} className="shrink-0 text-grey-ink/60 rtl:rotate-180" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

const NOTICE_ICON = { wifi: 'wifi', events: 'megaphone', ac: 'drop', cleaning: 'drop' }

function RulesList({ rules }) {
  const L = useL()
  return (
    <ul className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
      {rules.map((r, k) => (
        <li key={k} className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-[16px] leading-snug">
          <Icon name="check" size={16} className="shrink-0 text-teal" />
          {L(r)}
        </li>
      ))}
    </ul>
  )
}

/** Sheet opened by tapping an object on the map. */
function RoomSheet({ id, onClose, onJump }) {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const mode = useStore((s) => s.mode)
  const set = useStore((s) => s.set)
  const when = useWhen()
  const [range, setRange] = useState(null)
  const [day, setDay] = useState(null)
  useEffect(() => {
    setRange(null)
    setDay(null)
  }, [id])
  if (!id) return null

  if (id === 'public') {
    const z = data.zones.find((x) => x.type === 'public_seating')
    const last = data.seat_log[data.seat_log.length - 1]
    const ago = Math.max(0, now - last.time)
    const { taken, total } = data.seats
    return (
      <Sheet open onClose={onClose} title={L(z.name)} subtitle={t('home.updated_ago', { count: ago })}>
        <div className="mb-5 flex items-end gap-3 rounded-[22px] bg-surface px-5 py-4">
          <span className="flex items-baseline gap-1.5" dir="ltr">
            <span className="font-head text-[48px] leading-none font-bold tracking-tight">{taken}</span>
            <span className="font-head text-[22px] font-semibold text-grey-ink">/ {total}</span>
          </span>
          <span className="ms-auto pb-1 text-end text-[15px] leading-snug text-grey-ink">
            {t('home.seats_taken')}
            <br />
            <span className="font-semibold text-[#2f5656]">{t('home.seats_free', { count: total - taken })}</span>
          </span>
        </div>
        <h3 className="mb-1.5 px-1 text-[15px] font-semibold">{t('home.zone_rules')}</h3>
        <RulesList rules={z.rules} />
        <p className="mt-4 flex gap-2 px-1 text-[15px] text-grey-ink">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-navy" />
          {t('home.not_bookable')}
        </p>
      </Sheet>
    )
  }

  const sp = data.spaces.find((s) => s.id === id)
  const st = stateAt(data, id, when.date, when.min)
  const meta = `${t('map.people', { n: sp.capacity })} · ${sp.size_m2} m²`

  if (st.state === 'down') {
    return (
      <Sheet
        open
        onClose={onClose}
        title={L(sp.label)}
        subtitle={meta}
        footer={
          <button className="btn-primary w-full" onClick={() => navigate('/r/filter')}>
            {t('room.find_another')}
          </button>
        }
      >
        <div className="rounded-2xl bg-red/10 px-4 py-3.5">
          <p className="font-semibold text-[#a32f2f]">{t('room.down')}</p>
          <p className="mt-0.5 text-[15px]">{st.reason}</p>
        </div>
      </Sheet>
    )
  }

  if (st.state === 'booked') {
    const nf = nextFreeAt(data, id, when.date, when.min)
    const others = data.spaces.filter((s) => s.id !== id && stateAt(data, s.id, when.date, when.min).state === 'free')
    return (
      <Sheet
        open
        onClose={onClose}
        title={L(sp.label)}
        subtitle={meta}
        footer={
          <button className="btn-secondary w-full" onClick={() => navigate(`/r/room/${id}`)}>
            {t('room.see_details')}
          </button>
        }
      >
        <div className="mb-5 flex gap-3 rounded-2xl bg-surface px-4 py-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-ink">
            <Icon name="lock" size={18} />
          </span>
          <span>
            <span className="block text-[17px] font-semibold">{t('room.booked_until', { time: hm(st.booking.end) })}</span>
            <span className="block text-[15px] text-grey-ink">{nf !== null ? t('room.next_free', { time: hm(nf) }) : t('room.no_free_today')}</span>
          </span>
        </div>
        <h3 className="mb-1.5 px-1 text-[15px] font-semibold">{t('room.other_free')}</h3>
        {others.length ? (
          <div className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
            {others.map((o) => (
              <button key={o.id} onClick={() => onJump(o.id)} className="flex min-h-12 w-full items-center gap-3 px-4 text-start active:bg-black/[0.04]">
                <span className="size-2 shrink-0 rounded-full bg-teal" aria-hidden="true" />
                <span className="flex-1 text-[17px]">{L(o.label)}</span>
                <span className="text-[15px] text-grey-ink">{t('map.people', { n: o.capacity })}</span>
                <Icon name="next" size={16} className="text-grey-ink/60 rtl:rotate-180" />
              </button>
            ))}
          </div>
        ) : (
          <p className="px-1 text-grey-ink">{t('room.none_free')}</p>
        )}
      </Sheet>
    )
  }

  const slotDay = day || when.date
  const starts = freeStarts(data, id, slotDay, now, 30)
  const tap = (m) => {
    if (range && m >= range.start && m + 30 > range.end) {
      let ok = true
      for (let x = range.start; x <= m; x += 30) if (!starts.includes(x)) ok = false
      if (ok) return setRange({ start: range.start, end: m + 30 })
    }
    setRange({ start: m, end: starts.includes(m + 30) ? m + 60 : m + 30 })
  }
  const book = () => {
    const modeObj = data.work_modes.find((m) => m.id === mode)
    set({ draft: { spaceId: id, date: slotDay, start: range?.start, end: range?.end, reason: modeObj?.default_reason || '', source: 'map' } })
    onClose()
    requireLogin('/r/book')
  }
  return (
    <Sheet
      open
      onClose={onClose}
      title={L(sp.label)}
      subtitle={meta}
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button className="btn-secondary px-5" onClick={() => navigate(`/r/room/${id}`)}>
            {t('room.details')}
          </button>
          <button className="btn-primary" onClick={book} disabled={!starts.length}>
            {range ? <span dir="ltr">{t('room.book_range', { from: hm(range.start), to: hm(range.end) })}</span> : t('room.book_room')}
          </button>
        </div>
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <Photo color={sp.photos[0]} className="!w-24 shrink-0 !rounded-xl" label={L(sp.label)} />
        <div className="flex flex-wrap gap-1.5">
          {sp.features.map((f) => (
            <span key={f} className="rounded-full bg-surface px-2.5 py-1 text-[13px] text-ink">
              {t(`feature.${f}`)}
            </span>
          ))}
        </div>
      </div>
      <h3 className="mb-2 px-1 text-[15px] font-semibold">{t('when.day')}</h3>
      <div className="mb-5">
        <DayStrip
          value={slotDay}
          onChange={(d) => {
            setDay(d)
            setRange(null)
          }}
        />
      </div>
      <h3 className="px-1 text-[15px] font-semibold">{t('room.pick_slots')}</h3>
      <p className="mb-2.5 px-1 text-[13px] text-grey-ink">{t('room.pick_hint')}</p>
      {starts.length ? (
        <TimeGrid times={starts} isActive={(m) => range && m >= range.start && m < range.end} onPick={tap} />
      ) : (
        <p className="rounded-2xl bg-surface px-4 py-3 text-grey-ink">{t('room.no_free_today')}</p>
      )}
    </Sheet>
  )
}
