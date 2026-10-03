import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, usePersonName, useRequireLogin, useSpaceName } from '../lib/hooks'
import { activeNotices, amenityStatus, hoursFor, startAbs, dateOf, minOfDay, speedTests } from '../lib/logic'
import { hm } from '../lib/time'
import RoomSheet, { RulesList } from '../components/RoomSheet'
import RoomsCalendar, { RoomsLegend } from '../components/RoomsCalendar'
import { AmenitySheet } from '../components/Amenities'
import { Confirm, ScreenId, Sheet, StatusChip } from '../components/ui'
import Icon, { TechnoparkLogo } from '../components/Icon'

const NOTICE_ICON = { wifi: 'wifi', events: 'megaphone', ac: 'drop', cleaning: 'drop' }

/**
 * R-01 Today: everything about today only. "Know before you go" (seats, hours, cafeteria, Wi-Fi, notices),
 * your next booking, then every room's day; tap a free time to book it. Later days are on Book ahead.
 */
export default function Home() {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const selected = useStore((s) => s.selected)
  const set = useStore((s) => s.set)
  const lang = useStore((s) => s.lang)
  const renterId = useStore((s) => s.renterId)
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

  const today = dateOf(now)
  const h = hoursFor(data, today)
  const notices = activeNotices(data, now)
  const latest = notices[0]
  const { taken, total } = data.seats
  const me = data.renters.find((r) => r.id === renterId)
  const pn = usePersonName()
  const min = minOfDay(now)
  const part = min < 12 * 60 ? 'morning' : min < 17 * 60 ? 'afternoon' : 'evening'

  // Free time in the grid goes straight to Review: the room, day and time are already chosen.
  const bookSlot = (spaceId, range) => {
    if (!range) return onSelect(spaceId)
    set({ draft: { spaceId, date: today, dates: [today], start: range.start, end: range.end, source: 'today' } })
    requireLogin('/r/book')
  }

  return (
    <div className="space-y-7 pt-6 pb-4">
      <header className="px-5">
        <h1 className="font-head text-[30px] leading-[1.15] font-bold tracking-tight">
          {t(`home.greeting_${part}`)}
          {me && (
            <span className="text-grey-ink">
              {lang === 'ar' ? '، ' : ', '}
              {pn(me, true)}
            </span>
          )}
        </h1>
        <ScreenId id="R-01" className="mt-1" />
      </header>

      {/* Know before you go (US-1) */}
      <section className="space-y-3 px-4" aria-label={t('home.todays_status')}>
        <button
          onClick={() => onSelect('public')}
          className="block w-full rounded-[24px] bg-surface px-5 pt-4 pb-5 text-start active:bg-black/[0.06]"
          aria-label={t('home.seats_aria', { taken, total })}
        >
          <span className="flex items-center gap-2 text-[13px] font-medium text-grey-ink">
            <span className="live-dot size-2 rounded-full bg-teal" />
            {t('home.live')} · {L(data.zones[0].name)}
          </span>
          <span className="mt-1.5 flex items-end gap-3">
            <span className="font-head text-[52px] leading-none font-bold tracking-tight text-[#2f5656] tabular-nums">{total - taken}</span>
            <span className="pb-1.5 text-[19px] leading-tight font-semibold text-[#2f5656]">{t('home.seats_free_word', { count: total - taken })}</span>
            <span className="ms-auto pb-1.5 text-end text-[15px] text-grey-ink" dir="auto">
              {t('home.seats_of', { taken, total })}
            </span>
          </span>
          {/* one tick per seat: tall teal = free */}
          <span className="mt-4 flex h-5 items-end gap-[3px]" dir="ltr" aria-hidden="true">
            {Array.from({ length: total }, (_, k) => (
              <span key={k} className={`flex-1 rounded-full transition-all ${k < taken ? 'h-2 bg-black/[0.12]' : 'h-full bg-teal'}`} />
            ))}
          </span>
        </button>

        <div className="grid grid-cols-3 gap-2">
          <Tile
            to="/r/hours"
            icon="clock"
            label={t('home.hours')}
            value={
              !h
                ? t('home.closed_today')
                : min < h.open
                  ? t('home.opens_at', { time: hm(h.open) })
                  : min < h.close
                    ? t('home.until', { time: hm(h.close) })
                    : t('amenity.closed')
            }
            good={!!h && min >= h.open && min < h.close}
          />
          <CafeteriaTile onOpen={onSelect} />
          <WifiTile onOpen={onSelect} />
        </div>

        {latest && (
          <button
            onClick={() => setSheet('notices')}
            className="flex min-h-14 w-full items-center gap-3 rounded-[20px] bg-navy/[0.06] px-4 py-3 text-start active:bg-navy/[0.1]"
          >
            <Icon name="megaphone" size={18} className="shrink-0 text-navy" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{L(latest.text)}</span>
              <span className="block text-[13px] text-grey-ink">
                {t('home.posted', { time: hm(minOfDay(latest.posted_at)) })} · {t('home.n_notices', { count: notices.length })}
              </span>
            </span>
            <Icon name="next" size={16} className="shrink-0 text-grey-ink/60 rtl:rotate-180" />
          </button>
        )}
      </section>

      {me && <NextBooking renterId={me.id} />}

      {/* Every room's day; tap free time to book it (today only) */}
      <section aria-labelledby="h-rooms">
        <div className="mb-2 px-5">
          <h2 id="h-rooms" className="font-head text-[24px] font-bold tracking-tight">
            {t('today.rooms')}
          </h2>
          <p className="text-[15px] text-grey-ink">{t('today.rooms_hint')}</p>
        </div>
        {h && (
          <div className="mb-1 px-4">
            <RoomsLegend />
          </div>
        )}
        <RoomsCalendar date={today} onPick={bookSlot} onMine={(id) => navigate(`/r/confirmed/${id}`)} />
        <div className="mt-4 px-4">
          <Link to="/r/list" className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-surface px-4 active:bg-black/[0.06]">
            <Icon name="calendar" size={20} className="shrink-0 text-navy" />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-medium">{t('today.ahead')}</span>
              <span className="block text-[13px] text-grey-ink">{t('today.ahead_hint')}</span>
            </span>
            <Icon name="next" size={16} className="shrink-0 text-grey-ink/60 rtl:rotate-180" />
          </Link>
        </div>
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

/**
 * Your next booking today (only the closest one that hasn't started), with Confirm when it's waiting
 * and Cancel. The rest of your bookings are on My bookings.
 */
function NextBooking({ renterId }) {
  const { t } = useTranslation()
  const name = useSpaceName()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const confirmBooking = useStore((s) => s.confirmBooking)
  const cancelWithUndo = useStore((s) => s.cancelWithUndo)
  const showToast = useStore((s) => s.showToast)
  const [cancelling, setCancelling] = useState(false)
  const today = dateOf(now)
  const next = data.bookings
    .filter((b) => b.renter_id === renterId && b.date === today && ['awaiting_confirmation', 'confirmed'].includes(b.status) && startAbs(b) > now)
    .sort((a, b) => a.start - b.start)[0]
  if (!next) return null
  const waiting = next.status === 'awaiting_confirmation'
  return (
    <section className="px-4" aria-labelledby="h-next">
      <h2 id="h-next" className="mb-1.5 px-1 text-[15px] font-semibold">
        {t('today.next')}
      </h2>
      <div className="rounded-[22px] bg-surface p-4">
        <Link to={`/r/confirmed/${next.id}`} className="-m-1 flex items-start justify-between gap-3 rounded-xl p-1 active:bg-black/[0.04]">
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-semibold">{name(next.space_id)}</span>
            <span dir="ltr" className="block text-[15px] text-grey-ink tabular-nums">
              {hm(next.start)}–{hm(next.end)}
            </span>
          </span>
          <StatusChip status={next.status} />
        </Link>
        {waiting && <p className="mt-2 text-[13px] text-grey-ink">{t('bookings.confirm_hint')}</p>}
        <div className="mt-3 flex gap-2">
          {waiting && (
            <button
              className="btn-primary !min-h-11 flex-1"
              onClick={() => {
                confirmBooking(next.id)
                showToast('toast.confirmed')
              }}
            >
              {t('bookings.confirm')}
            </button>
          )}
          <button className="btn-danger !min-h-11 flex-1" onClick={() => setCancelling(true)}>
            {t('bookings.cancel')}
          </button>
        </div>
      </div>
      <Confirm
        open={cancelling}
        title={t('bookings.cancel_title')}
        body={t('bookings.cancel_body')}
        okLabel={t('bookings.cancel_ok')}
        danger
        onCancel={() => setCancelling(false)}
        onOk={() => {
          cancelWithUndo(next.id)
          setCancelling(false)
        }}
      />
    </section>
  )
}

/** Small glanceable card: icon + label on top, one short value underneath (wraps rather than truncating on 375 px phones). */
function Tile({ to, onClick, icon, label, value, good, ltr }) {
  const C = to ? Link : 'button'
  return (
    <C
      to={to}
      onClick={onClick}
      className="flex min-h-[84px] min-w-0 flex-col justify-between gap-2 rounded-[20px] bg-surface px-3 py-3 text-start active:bg-black/[0.06]"
    >
      <span className="flex items-center gap-1.5 text-[13px] text-grey-ink">
        <Icon name={icon} size={16} className="shrink-0 text-navy" />
        <span className="truncate">{label}</span>
      </span>
      <span className={`text-[15px] leading-tight font-semibold tabular-nums ${good ? 'text-[#2f5656]' : 'text-ink'}`} dir={ltr ? 'ltr' : undefined}>
        {value}
      </span>
    </C>
  )
}

function CafeteriaTile({ onOpen }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const cafe = data.amenities.find((a) => a.id === 'cafeteria')
  const st = amenityStatus(data, cafe, now)
  const value = st.open
    ? t('home.until', { time: hm(st.until) })
    : st.next?.date === dateOf(now)
      ? t('home.opens_at', { time: hm(st.next.min) })
      : t('amenity.closed')
  return <Tile onClick={() => onOpen('cafeteria')} icon="cup" label={L(cafe.name)} value={value} good={st.open} />
}

/** Last Wi-Fi speed test (download); the sheet has the full ↓/↑ history. */
function WifiTile({ onOpen }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const last = speedTests(data, now)[0]
  return (
    <Tile
      onClick={() => onOpen('wifi')}
      icon="wifi"
      label={L(data.amenities.find((a) => a.id === 'wifi').name)}
      value={last ? `↓ ${last.down} Mbps` : t('amenity.no_test')}
      good={!!last}
      ltr={!!last}
    />
  )
}
