import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useRequireLogin } from '../lib/hooks'
import { activeNotices, dayBlocks, freeStarts, hoursFor, stateAt, nextFreeAt, dateOf, minOfDay } from '../lib/logic'
import { hm } from '../lib/time'
import FloorPlan from '../components/FloorPlan'
import { MapListSwitch, ModeChips, WhenBar, useWhen } from '../components/Browse'
import { Chip, Photo, ScreenId, Sheet } from '../components/ui'
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

  return (
    <div className="space-y-5 pt-3">
      <ScreenId id="R-01" className="px-4" />
      {/* Status card (US-1 AC1, AC2) */}
      <section className="mx-4 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-grey/15" aria-label={t('home.todays_status')}>
        <div className="flex divide-x divide-grey/15 rtl:divide-x-reverse">
          <button
            onClick={() => onSelect('public')}
            className="flex min-h-16 flex-1 items-center gap-3 p-3 text-start"
            aria-label={t('home.seats_aria', { taken, total })}
          >
            <span className="rounded-full bg-orange px-3 py-0.5 font-head text-[20px] font-bold text-white" dir="ltr">
              {taken}/{total}
            </span>
            <span className="text-sm leading-tight">
              <span className="block font-semibold">{t('home.seats_taken')}</span>
              <span className="text-grey-ink">{L(data.zones[0].name)}</span>
            </span>
          </button>
          <Link to="/r/hours" className="flex min-h-16 items-center gap-2 px-3 text-sm leading-tight text-navy">
            <Icon name="clock" size={18} className="shrink-0" />
            {h ? (
              <span>
                <span className="block font-semibold">{t('home.open')}</span>
                <span dir="ltr">
                  {hm(h.open)}–{hm(h.close)}
                </span>
              </span>
            ) : (
              <span className="font-semibold">{t('home.closed_today')}</span>
            )}
          </Link>
        </div>
        {latest && (
          <button onClick={() => setSheet('notices')} className="flex w-full items-center gap-3 border-t border-grey/15 p-3 text-start">
            <Icon name="megaphone" className="shrink-0 text-orange" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{L(latest.text)}</span>
              <span className="text-xs text-grey-ink">
                {t('home.posted', { time: hm(minOfDay(latest.posted_at)) })} · {t('home.n_notices', { count: notices.length })}
              </span>
            </span>
            <Icon name="next" size={18} className="shrink-0 text-grey-ink rtl:rotate-180" />
          </button>
        )}
      </section>

      <ModeChips />
      <WhenBar />

      <section className="px-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-head text-xl font-bold">{t('home.floor_plan')}</h2>
          <MapListSwitch active="map" />
        </div>
        <FloorPlan date={when.date} min={when.min} mode={mode} selected={selected} onSelect={onSelect} hint={t('home.map_hint')} />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Legend swatch="bg-[#DCE8E8] border-teal" label={t('legend.free')} />
          <Legend swatch="bg-[#D5DCDC] border-grey" label={t('legend.booked')} lock />
          <Legend swatch="bg-white border-orange border-2" label={t('legend.match')} />
          <Legend swatch="hatch border-red" label={t('legend.down')} />
        </div>
        <div className="fade-x no-scrollbar -mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4">
          <span className="shrink-0 text-sm font-semibold">{t('home.zone_rules')}</span>
          {data.zones
            .filter((z) => z.rules.length)
            .map((z) => (
              <button
                key={z.id}
                onClick={() => setSheet(z.id)}
                className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-sm ring-1 ring-grey/20"
              >
                <Icon name="info" size={16} className="text-navy" /> {L(z.name)}
              </button>
            ))}
        </div>
      </section>

      <RoomsToday />

      {/* Future scope */}
      <div className="mx-4 rounded-lg border border-dashed border-grey/40 bg-surface p-4 text-grey-ink" aria-disabled="true">
        <p className="font-head text-lg font-semibold">{t('home.coming_soon')}</p>
        <p className="text-sm">{t('home.coming_soon_body')}</p>
      </div>

      <button onClick={() => setSheet('about')} className="mx-auto block min-h-11 px-4 font-head text-[14px] font-light tracking-wide text-grey-ink">
        Technopark · Palestine
      </button>

      <Sheet open={sheet === 'notices'} onClose={() => setSheet(null)} title={t('home.todays_status')}>
        <ul className="space-y-2">
          {notices.map((n) => (
            <li key={n.id} className="rounded-lg bg-surface p-3">
              <span className="me-2 rounded-full bg-navy/10 px-2 py-0.5 text-xs font-semibold text-navy">{t(`tag.${n.tag}`)}</span>
              <span className="text-xs text-grey-ink">{t('home.posted', { time: hm(minOfDay(n.posted_at)) })}</span>
              <p className="mt-1">{L(n.text)}</p>
            </li>
          ))}
        </ul>
      </Sheet>
      {data.zones.map((z) => (
        <Sheet key={z.id} open={sheet === z.id} onClose={() => setSheet(null)} title={t('home.rules_for', { zone: L(z.name) })}>
          <ul className="list-disc space-y-1 ps-5">
            {z.rules.map((r, i) => (
              <li key={i}>{L(r)}</li>
            ))}
          </ul>
        </Sheet>
      ))}
      <Sheet open={sheet === 'about'} onClose={() => setSheet(null)} title={t('about.title')}>
        <TechnoparkLogo />
        <p className="mt-3">{t('about.body')}</p>
        <p className="mt-2 text-sm text-grey-ink">{t('about.vision')}</p>
      </Sheet>
      <RoomSheet id={roomSheet} onClose={() => setRoomSheet(null)} onJump={onSelect} />
    </div>
  )
}

function Legend({ swatch, label, lock }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`relative inline-block size-4 rounded border ${swatch}`}>
        {lock && <span className="absolute -end-1 -top-1 size-2 rounded-full bg-ink" />}
      </span>
      {label}
    </span>
  )
}

/** Free / Booked blocks per room for the rest of today (US-1 AC3) */
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
    <section className="px-4">
      <h2 className="mb-2 font-head text-xl font-bold">{t('home.rooms_today')}</h2>
      <div className="space-y-2">
        {data.spaces.map((sp) => {
          const blocks = dayBlocks(data, sp.id, date, from)
          return (
            <Link key={sp.id} to={`/r/room/${sp.id}`} className="block rounded-lg bg-white p-3 ring-1 ring-grey/20">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-semibold">{L(sp.label)}</span>
                <span className="text-xs text-grey-ink">{t('map.people', { n: sp.capacity })}</span>
              </div>
              <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" dir="ltr" aria-hidden="true">
                {blocks.map((b, i) => (
                  <span
                    key={i}
                    style={{ width: `${((b.to - b.from) / span) * 100}%` }}
                    className={b.state === 'free' ? 'bg-teal/45' : b.state === 'down' ? 'hatch bg-white' : 'bg-grey/70'}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs text-grey-ink" dir="ltr" aria-hidden="true">
                <span>{hm(from)}</span>
                <span>{hm(h.close)}</span>
              </div>
              <p className={`text-sm font-semibold ${blocks[0].state === 'free' ? 'text-[#2f5656]' : blocks[0].state === 'down' ? 'text-[#a32f2f]' : ''}`}>
                {summary(blocks, h.close)}
              </p>
              {blocks.some((b) => b.state !== 'free') && (
                <p className="text-xs text-grey-ink">
                  {t('home.taken_times')}{' '}
                  <span dir="ltr">
                    {blocks
                      .filter((b) => b.state !== 'free')
                      .map((b) => `${hm(b.from)}–${hm(b.to)}`)
                      .join(', ')}
                  </span>
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </section>
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
  useEffect(() => setRange(null), [id])
  if (!id) return null

  if (id === 'public') {
    const z = data.zones.find((x) => x.type === 'public_seating')
    const last = data.seat_log[data.seat_log.length - 1]
    const ago = Math.max(0, now - last.time)
    return (
      <Sheet open onClose={onClose} title={L(z.name)}>
        <p className="font-head text-4xl font-bold">{t('home.seats_of', { taken: data.seats.taken, total: data.seats.total })}</p>
        <p className="text-sm text-grey-ink">{t('home.updated_ago', { count: ago })}</p>
        <h3 className="mt-3 font-semibold">{t('home.zone_rules')}</h3>
        <ul className="list-disc ps-5">
          {z.rules.map((r, i) => (
            <li key={i}>{L(r)}</li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg bg-surface p-3 text-sm">{t('home.not_bookable')}</p>
      </Sheet>
    )
  }

  const sp = data.spaces.find((s) => s.id === id)
  const st = stateAt(data, id, when.date, when.min)

  if (st.state === 'down') {
    return (
      <Sheet open onClose={onClose} title={L(sp.label)}>
        <p className="mb-1 font-semibold text-[#a32f2f]">{t('room.down')}</p>
        <p className="mb-4">{st.reason}</p>
        <button className="btn-primary w-full" onClick={() => navigate('/r/filter')}>
          {t('room.find_another')}
        </button>
      </Sheet>
    )
  }

  if (st.state === 'booked') {
    const nf = nextFreeAt(data, id, when.date, when.min)
    const others = data.spaces.filter((s) => s.id !== id && stateAt(data, s.id, when.date, when.min).state === 'free')
    return (
      <Sheet open onClose={onClose} title={L(sp.label)}>
        <p className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="lock" size={18} />
          {t('room.booked_until', { time: hm(st.booking.end) })}
        </p>
        <p className="mb-3 text-grey-ink">{nf !== null ? t('room.next_free', { time: hm(nf) }) : t('room.no_free_today')}</p>
        <h3 className="mb-2 font-semibold">{t('room.other_free')}</h3>
        <div className="grid gap-2">
          {others.length ? (
            others.map((o) => (
              <button key={o.id} onClick={() => onJump(o.id)} className="flex min-h-11 items-center justify-between rounded-lg bg-surface px-3 text-start">
                <span>
                  {L(o.label)} · {t('map.people', { n: o.capacity })}
                </span>
                <Icon name="next" size={18} className="rtl:rotate-180" />
              </button>
            ))
          ) : (
            <p className="text-grey-ink">{t('room.none_free')}</p>
          )}
        </div>
        <button className="btn-link mt-2" onClick={() => navigate(`/r/room/${id}`)}>
          {t('room.see_details')}
        </button>
      </Sheet>
    )
  }

  const starts = freeStarts(data, id, when.date, now, 30)
  const inRange = (m) => range && m >= range.start && m < range.end
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
    set({ draft: { spaceId: id, date: when.date, start: range?.start, end: range?.end, reason: modeObj?.default_reason || '', source: 'map' } })
    onClose()
    requireLogin('/r/book')
  }
  return (
    <Sheet open onClose={onClose} title={L(sp.label)}>
      <div className="mb-3 flex gap-3">
        <Photo color={sp.photos[0]} className="!w-28 shrink-0" label={L(sp.label)} />
        <div className="text-sm">
          <p>
            {t('map.people', { n: sp.capacity })} · {sp.size_m2} m²
          </p>
          <p className="text-grey-ink">{sp.features.map((f) => t(`feature.${f}`)).join(' · ')}</p>
          <p className="mt-1 font-semibold text-[#2f5656]">{t('map.free')}</p>
        </div>
      </div>
      <p className="mb-1 text-sm font-semibold">{t('room.pick_slots')}</p>
      <p className="mb-2 text-xs text-grey-ink">{t('room.pick_hint')}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {starts.length ? (
          starts.map((m) => (
            <Chip key={m} active={inRange(m)} onClick={() => tap(m)}>
              {hm(m)}
            </Chip>
          ))
        ) : (
          <p className="text-grey-ink">{t('room.no_free_today')}</p>
        )}
      </div>
      {range && (
        <p className="mb-2 font-semibold" dir="ltr">
          {hm(range.start)}–{hm(range.end)}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-secondary" onClick={() => navigate(`/r/room/${id}`)}>
          {t('room.see_details')}
        </button>
        <button className="btn-primary" onClick={book} disabled={!starts.length}>
          {t('room.book_room')}
        </button>
      </div>
    </Sheet>
  )
}
