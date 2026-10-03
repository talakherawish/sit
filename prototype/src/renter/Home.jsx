import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, usePersonName, useSpaceName } from '../lib/hooks'
import { REMINDERS, activeNotices, todayNotice, amenityStatus, hoursFor, isFree, reminderAt, startAbs, dateOf, minOfDay, speedTests } from '../lib/logic'
import { ceil30, fmtDate, hm } from '../lib/time'
import { useDuration } from '../components/DayTimeline'
import Receipt from '../components/Receipt'
import RoomSheet, { RulesList } from '../components/RoomSheet'
import RoomsCalendar from '../components/RoomsCalendar'
import { AmenitySheet } from '../components/Amenities'
import { Chip, Confirm, Overlay, ScreenId, Sheet } from '../components/ui'
import Icon from '../components/Icon'

const NOTICE_ICON = { wifi: 'wifi', events: 'megaphone', ac: 'drop', cleaning: 'drop' }

/**
 * R-01 Today: everything about today only. "Know before you go" (seats, hours, cafeteria, Wi-Fi, one notice),
 * your next booking as one small row, a Book button, then every room's day; tap a free time to book it.
 * Later days are on Book ahead.
 */
export default function Home() {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const selected = useStore((s) => s.selected)
  const set = useStore((s) => s.set)
  const lang = useStore((s) => s.lang)
  const renterId = useStore((s) => s.renterId)
  const [sheet, setSheet] = useState(null) // 'notices' | zone id for rules | null
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
  const latest = todayNotice(notices)
  const { taken, total } = data.seats
  const me = data.renters.find((r) => r.id === renterId)
  const pn = usePersonName()
  const min = minOfDay(now)
  const part = min < 12 * 60 ? 'morning' : min < 17 * 60 ? 'afternoon' : 'evening'

  // A time picked in the grid, kept in the store so logging in on the way doesn't lose it. It's dropped
  // once it's no longer bookable (time moved on, or someone else took it).
  const rawPick = useStore((s) => s.todayPick)
  const pick =
    rawPick && rawPick.date === today && rawPick.start >= ceil30(min) && isFree(data, rawPick.spaceId, today, rawPick.start, rawPick.end) ? rawPick : null
  const setPick = (sel) => set({ todayPick: sel ? { reminder: null, ...sel, date: today } : null })

  // Book: pick the soonest free hour in any room (half an hour if that's all there is) and bring the grid up.
  const grid = useRef(null)
  // Today is two stops: the first screen and Rooms today. When a scroll stops in between, it carries on
  // to the next stop in the direction you were going; inside the grid you scroll freely.
  useEffect(() => {
    const main = grid.current?.closest('main')
    if (!main) return
    let settled = main.scrollTop
    let timer
    const onScroll = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const stop = grid.current.offsetTop - parseFloat(getComputedStyle(main).scrollPaddingTop)
        const y = main.scrollTop
        if (y > 2 && y < stop - 2) main.scrollTo({ top: y > settled ? stop : 0, behavior: 'smooth' })
        else settled = y
      }, 140)
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      main.removeEventListener('scroll', onScroll)
    }
  }, [])
  let soonest = null
  for (let m = h ? Math.max(h.open, ceil30(min)) : Infinity; !soonest && m + 30 <= h?.close; m += 30) {
    const sp = data.spaces.find((s) => isFree(data, s.id, today, m, m + 30))
    if (sp) soonest = { spaceId: sp.id, start: m, end: m + 60 <= h.close && isFree(data, sp.id, today, m, m + 60) ? m + 60 : m + 30 }
  }
  const bookSoonest = () => {
    setPick(soonest)
    grid.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-7 pt-6 pb-4">
      {/* The first screen, down to Book a room, fills the phone so Rooms today doesn't peek in underneath:
          visible height = screen − nav bar − tab bar (59 / 79 px), less this page's top padding and gap */}
      <div className="min-h-[calc(var(--screen-h)-var(--app-top)-163px)] space-y-7 sm:min-h-[calc(var(--screen-h)-235px)]">
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
              <Icon name={NOTICE_ICON[latest.tag] || 'megaphone'} size={18} className="shrink-0 text-navy" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{L(latest.text)}</span>
                <span className="block text-[13px] text-grey-ink">
                  {t(`tag.${latest.tag}`)} · {t('home.posted', { time: hm(minOfDay(latest.posted_at)) })}
                </span>
              </span>
              <Icon name="next" size={16} className="shrink-0 text-grey-ink/60 rtl:rotate-180" />
            </button>
          )}

          {me && <NextBooking renterId={me.id} />}

          {soonest && (
            <button onClick={bookSoonest} className="btn-primary flex w-full items-center gap-2 !px-5">
              <Icon name="plus" size={20} className="shrink-0" />
              <span className="flex-1 text-start">{t('home.book_cta')}</span>
              <span className="text-[15px] font-medium opacity-80">{t('today.next_free', { time: hm(soonest.start) })}</span>
            </button>
          )}
        </section>
      </div>

      {/* Every room's day; tap free time to book it (today only). Its own section: scrolling to it brings it to the top */}
      <section ref={grid} aria-labelledby="h-rooms">
        <div className="mb-2 px-5">
          <h2 id="h-rooms" className="font-head text-[24px] font-bold tracking-tight">
            {t('today.rooms')}
          </h2>
        </div>
        <RoomsCalendar date={today} onPick={(id) => onSelect(id)} onMine={(id) => navigate(`/r/confirmed/${id}`)} selection={pick} onSelect={setPick} />
        <QuickBook pick={pick} onChange={setPick} />
        {/* room for the Confirm booking bar so it never hides the end of the page */}
        <div className={`mt-4 px-4 ${pick ? 'pb-16' : ''}`}>
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

      <Sheet
        open={sheet === 'notices'}
        onClose={() => setSheet(null)}
        title={t('home.todays_status')}
        subtitle={t('home.n_notices', { count: notices.length })}
      >
        <ul className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">
          {[latest, ...notices.filter((n) => n !== latest)].filter(Boolean).map((n) => (
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
      {data.amenities.some((a) => a.id === roomSheet) ? (
        <AmenitySheet id={roomSheet} onClose={closeRoom} />
      ) : (
        <RoomSheet
          id={roomSheet}
          onClose={closeRoom}
          onJump={onSelect}
          onBook={(sel) => {
            closeRoom()
            setPick(sel)
          }}
        />
      )}
    </div>
  )
}

/**
 * Your next booking today (only the closest one that hasn't started), as one small row the height of the
 * notice: tap it to open the booking, or Confirm / Cancel right there. The rest are on My bookings.
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
    <div className="flex min-h-14 w-full items-center gap-2 rounded-[20px] bg-surface py-2 ps-4 pe-2" aria-label={t('today.next')}>
      <Link to={`/r/confirmed/${next.id}`} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-60">
        <Icon name="ticket" size={18} className="shrink-0 text-navy" />
        <span className="min-w-0">
          {/* Time first so it never gets cut off on a phone; the room and "next booking" can */}
          <span className="block text-[15px] font-medium tabular-nums">
            <span dir="ltr">
              {hm(next.start)}–{hm(next.end)}
            </span>
          </span>
          <span className="block truncate text-[13px] text-grey-ink">
            {name(next.space_id, true)} · {t(waiting ? 'today.next' : 'status.confirmed')}
          </span>
        </span>
      </Link>
      {waiting && (
        <button
          className="min-h-9 shrink-0 rounded-full bg-navy px-3 text-[15px] font-semibold text-white active:opacity-80"
          onClick={() => {
            confirmBooking(next.id)
            showToast('toast.confirmed')
          }}
        >
          {t('bookings.confirm')}
        </button>
      )}
      <button
        className="min-h-9 shrink-0 rounded-full bg-black/[0.05] px-3 text-[15px] font-medium text-[#c23b3b] active:bg-black/[0.1]"
        onClick={() => setCancelling(true)}
      >
        {t('bookings.cancel')}
      </button>
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
    </div>
  )
}

/**
 * Booking for today without leaving Today. Picking a time in the grid slides a small "Confirm booking" bar
 * out from behind the tab bar, so the grid stays free to keep choosing. Drag it up (or tap it) for the
 * receipt: room, day, time, length and reminder; drag it down to tuck it away again. Tapping the picked
 * time again drops it and the bar slides away. Confirming shows the receipt, then "Booked · Undo".
 */
function QuickBook({ pick, onChange }) {
  const { t } = useTranslation()
  const name = useSpaceName()
  const dur = useDuration()
  const pn = usePersonName()
  const s = useStore()
  const [receipt, setReceipt] = useState(null)
  const [open, setOpen] = useState(false)
  const [drag, setDrag] = useState(null) // { from, dy } while dragging
  const [last, setLast] = useState(pick) // keeps the bar filled in while it slides away
  const details = useRef(null)
  const [detailsH, setDetailsH] = useState(0)
  const today = dateOf(s.now)

  if (pick && pick !== last) setLast(pick)
  if (!pick && open) setOpen(false)
  const shown = pick || last
  useLayoutEffect(() => {
    if (details.current) setDetailsH(details.current.offsetHeight)
  }, [shown, s.lang])

  const remOpts = shown ? REMINDERS.map((k) => ({ k, at: reminderAt(today, shown.start, k) })).filter((o) => o.at > s.now) : []
  const reminder = remOpts.some((o) => o.k === shown?.reminder) ? shown.reminder : null

  const confirm = () => {
    if (!s.renterId) return s.set({ gate: { returnTo: '/r/home' } })
    const me = s.data.renters.find((r) => r.id === s.renterId)
    const { ids } = s.createBooking(
      { renterId: me.id, spaceId: pick.spaceId, date: today, dates: [today], start: pick.start, end: pick.end, reason: null, reminder },
      { source: 'today' },
    )
    if (!ids.length) return s.showToast('toast.err_nothing_booked', { name: pn(me, true) })
    onChange(null)
    setReceipt({ ids, bookings: useStore.getState().data.bookings.filter((b) => ids.includes(b.id)), email: me.email || me.phone, reminder })
  }
  const done = () => {
    if (!receipt) return
    const { ids } = receipt
    setReceipt(null)
    s.showToast('toast.booked', {}, () => useStore.getState().removeBookings(ids))
  }

  // How far the panel is pushed down behind the tab bar: 0 = receipt showing, detailsH = just the bar.
  const offset = !pick ? detailsH + 140 : Math.min(detailsH, Math.max(0, (open ? 0 : detailsH) + (drag?.dy || 0)))
  const down = (e) => {
    if (e.target.closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ from: e.clientY, dy: 0 })
  }
  const move = (e) => drag && setDrag({ ...drag, dy: e.clientY - drag.from })
  const up = () => {
    if (!drag) return
    // A tap toggles; a drag settles on whichever side it was let go nearer to
    setOpen(Math.abs(drag.dy) < 6 ? !open : offset < detailsH / 2)
    setDrag(null)
  }
  const Row = ({ label, children }) => (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="shrink-0 text-[15px] text-grey-ink">{label}</span>
      <span className="min-w-0 text-end text-[15px] font-medium">{children}</span>
    </div>
  )

  return (
    <>
      {shown && (
        <Overlay>
          {(pos) => (
            // Below the tab bar (z-30) in the stack, so it slides out from behind it
            <div
              className={`${pos} inset-x-0 bottom-0 z-20 px-2 ${drag ? '' : 'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]'}`}
              style={{ transform: `translateY(${offset}px)`, pointerEvents: pick ? undefined : 'none' }}
              onTransitionEnd={(e) => e.target === e.currentTarget && !pick && setLast(null)}
              role="region"
              aria-label={t('today.confirm_booking')}
            >
              <div className="animate-sheet rounded-t-[24px] bg-white shadow-[0_-8px_30px_rgba(16,24,40,0.16)] ring-1 ring-black/[0.06]">
                <div
                  className="cursor-grab touch-none px-4 pt-2 select-none active:cursor-grabbing"
                  onPointerDown={down}
                  onPointerMove={move}
                  onPointerUp={up}
                  onPointerCancel={up}
                >
                  <div className="mx-auto h-[5px] w-9 rounded-full bg-black/15" />
                  <div className="flex items-center gap-3 pt-2 pb-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{name(shown.spaceId)}</span>
                      <span className="block text-[13px] text-grey-ink">
                        <span dir="ltr" className="tabular-nums">
                          {hm(shown.start)}–{hm(shown.end)}
                        </span>{' '}
                        · {dur(shown.end - shown.start)}
                      </span>
                    </span>
                    <button className="min-h-11 shrink-0 rounded-full bg-navy px-5 text-[15px] font-semibold text-white active:opacity-80" onClick={confirm}>
                      {t('today.confirm_booking')}
                    </button>
                  </div>
                </div>
                {/* The receipt; it fades as it tucks behind the tab bar */}
                <div ref={details} className="px-5" style={{ opacity: detailsH ? 1 - offset / detailsH : 0 }} aria-hidden={!open}>
                  <div className="divide-y divide-dashed divide-black/15 border-t border-dashed border-black/15">
                    <Row label={t('receipt.room')}>{name(shown.spaceId)}</Row>
                    <Row label={t('book.date')}>{fmtDate(today, s.lang, { weekday: 'long', day: 'numeric', month: 'long' })}</Row>
                    <Row label={t('book.time')}>
                      <span dir="ltr" className="tabular-nums">
                        {hm(shown.start)}–{hm(shown.end)}
                      </span>{' '}
                      · {dur(shown.end - shown.start)}
                    </Row>
                  </div>
                  <p className="mt-2 mb-1.5 text-[13px] font-semibold">{t('book.reminder')}</p>
                  {remOpts.length ? (
                    <div className="flex flex-wrap gap-2">
                      {remOpts.map((o) => (
                        <Chip key={o.k} active={reminder === o.k} onClick={() => onChange({ ...shown, reminder: reminder === o.k ? null : o.k })}>
                          {t(`reminder.${o.k}`)}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-surface px-3 py-2 text-[13px]">{t('book.no_reminder')}</p>
                  )}
                  {reminder && <p className="mt-2 text-[12px] text-grey-ink">{t('book.reminder_hint')}</p>}
                  <div className="h-3" />
                </div>
                {/* room for the tab bar, which the panel sits behind */}
                <div className="h-[59px] sm:h-[79px]" />
              </div>
            </div>
          )}
        </Overlay>
      )}
      {receipt && <Receipt bookings={receipt.bookings} email={receipt.email} reminder={receipt.reminder} onDone={done} />}
    </>
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
