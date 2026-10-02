import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { activeNotices, hoursFor, stateAt, nextFreeAt, dateOf, minOfDay, speedTests } from '../lib/logic'
import { hm } from '../lib/time'
import FloorPlan from '../components/FloorPlan'
import RoomSheet, { RulesList } from '../components/RoomSheet'
import { AmenitySheet, useAmenityLine } from '../components/Amenities'
import { ModeChips, WhenBar, useWhen } from '../components/Browse'
import { ScreenId, Sheet } from '../components/ui'
import Icon, { TechnoparkLogo } from '../components/Icon'

const NOTICE_ICON = { wifi: 'wifi', events: 'megaphone', ac: 'drop', cleaning: 'drop' }

/** R-01 Home: today's status, the floor plan, then rooms that suit what you're here to do. */
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

  // Arriving with a room already selected (e.g. from a notification) opens its sheet.
  useEffect(() => {
    if (selected) setRoomSheet(selected)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSelect = (id) => {
    set({ selected: id })
    setRoomSheet(id)
  }
  const closeRoom = () => {
    set({ selected: null })
    setRoomSheet(null)
  }

  const h = hoursFor(data, dateOf(now))
  const notices = activeNotices(data, now)
  const latest = notices[0]
  const { taken, total } = data.seats
  const me = data.renters.find((r) => r.id === renterId)
  const min = minOfDay(now)
  const part = min < 12 * 60 ? 'morning' : min < 17 * 60 ? 'afternoon' : 'evening'

  return (
    <div className="space-y-10 px-4 pt-3 pb-4">
      <div className="space-y-5">
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

        {/* Live seats (US-1 AC1) + hours, amenities and the latest notice (US-1 AC2) */}
        <section className="overflow-hidden rounded-[26px] bg-surface" aria-label={t('home.todays_status')}>
          <button onClick={() => onSelect('public')} className="block w-full px-5 pt-4 pb-4 text-start" aria-label={t('home.seats_aria', { taken, total })}>
            <span className="flex items-center gap-2 text-[13px] font-medium text-grey-ink">
              <span className="live-dot size-2 rounded-full bg-teal" />
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
                <span key={k} className={`flex-1 rounded-full transition-all ${k < taken ? 'h-full bg-navy' : 'h-2.5 bg-black/[0.09]'}`} />
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
                <Icon name="megaphone" size={18} className="shrink-0 text-navy" />
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
      </div>

      {/* Floor plan */}
      <section aria-labelledby="h-plan">
        <div className="mb-1 px-1">
          <h2 id="h-plan" className="font-head text-[24px] font-bold tracking-tight">
            {t('home.floor_plan')}
          </h2>
          <p className="text-[15px] text-grey-ink">{t('home.plan_hint')}</p>
        </div>
        <div className="-mx-4 mb-3">
          <WhenBar />
        </div>
        <FloorPlan date={when.date} min={when.min} mode={mode} selected={selected} onSelect={onSelect} />
        <div className="mt-3 flex items-center justify-between gap-2 px-1 text-[13px] whitespace-nowrap text-grey-ink">
          <Legend swatch="bg-[#E4EFEE] border-teal" label={t('legend.free')} />
          <Legend swatch="bg-[#EDEDF0] border-grey" label={t('legend.booked')} lock />
          <Legend swatch="bg-white border-navy border-2" label={t('legend.selected')} />
          <Legend swatch="hatch border-red" label={t('legend.down')} />
        </div>
        <div className="fade-x no-scrollbar -mx-4 mt-4 flex items-center gap-2 overflow-x-auto px-5">
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

      {/* What are you here to do? → rooms that suit it */}
      <section aria-labelledby="h-how">
        <div className="-mx-4">
          <ModeChips headingId="h-how" />
        </div>
        <SuitedRooms onOpen={onSelect} />
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
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-navy">
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
        <TechnoparkLogo full className="mx-auto" />
        <p className="mt-5 text-[17px]">{t('about.body')}</p>
        <p className="mt-3 font-head text-[22px] leading-snug font-semibold tracking-tight text-navy">“{t('about.vision')}”</p>
      </Sheet>
      {data.amenities.some((a) => a.id === roomSheet) ? (
        <AmenitySheet id={roomSheet} onClose={closeRoom} />
      ) : (
        <RoomSheet id={roomSheet} onClose={closeRoom} onJump={onSelect} />
      )}
    </div>
  )
}

/** Rooms that fit the chosen activity, with their state at the chosen time. */
function SuitedRooms({ onOpen }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const mode = useStore((s) => s.mode)
  const when = useWhen()
  const hl = data.work_modes.find((m) => m.id === mode)?.highlight_zone_types || []
  const zoneType = (zid) => data.zones.find((z) => z.id === zid).type
  const rooms = data.spaces.filter((sp) => hl.includes(zoneType(sp.zone_id)))
  const pub = hl.includes('public_seating')
  if (mode === 'browse') return null
  return (
    <div className="mt-3 divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
      {pub && (
        <button onClick={() => onOpen('public')} className="flex min-h-14 w-full items-center gap-3 px-4 text-start active:bg-black/[0.04]">
          <span className="size-2 shrink-0 rounded-full bg-teal" />
          <span className="flex-1 text-[17px]">{L(data.zones.find((z) => z.type === 'public_seating').name)}</span>
          <span className="text-[15px] font-medium text-[#2f5656]">{t('home.seats_free', { count: data.seats.total - data.seats.taken })}</span>
          <Icon name="next" size={16} className="text-grey-ink/60 rtl:rotate-180" />
        </button>
      )}
      {rooms.map((sp) => {
        const st = stateAt(data, sp.id, when.date, when.min)
        const nf = st.state === 'booked' ? nextFreeAt(data, sp.id, when.date, when.min) : null
        const text =
          st.state === 'free' ? t('legend.free') : st.state === 'down' ? t('map.down') : nf !== null ? t('list.free_from', { time: hm(nf) }) : t('map.booked')
        return (
          <button key={sp.id} onClick={() => onOpen(sp.id)} className="flex min-h-14 w-full items-center gap-3 px-4 text-start active:bg-black/[0.04]">
            <span className={`size-2 shrink-0 rounded-full ${st.state === 'free' ? 'bg-teal' : st.state === 'down' ? 'bg-red' : 'bg-grey/60'}`} />
            <span className="flex-1">
              <span className="block text-[17px]">{L(sp.label)}</span>
              <span className="block text-[13px] text-grey-ink">{t('map.people', { n: sp.capacity })}</span>
            </span>
            <span className={`text-[15px] ${st.state === 'free' ? 'font-medium text-[#2f5656]' : 'text-grey-ink'}`}>{text}</span>
            <Icon name="next" size={16} className="text-grey-ink/60 rtl:rotate-180" />
          </button>
        )
      })}
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
      <span className={`relative inline-block size-3.5 shrink-0 rounded-[4px] border ${swatch}`}>
        {lock && <span className="absolute -end-1 -top-1 size-2 rounded-full bg-ink" />}
      </span>
      {label}
    </span>
  )
}
