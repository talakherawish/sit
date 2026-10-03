import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { openPanelOnTripleTap, usePersonName, useRequireLogin, useTemplate } from '../lib/hooks'
import { NOTIF_ICON, dateOf, minOfDay } from '../lib/logic'
import { hm } from '../lib/time'
import Icon, { TechnoparkLogo } from '../components/Icon'
import { OverlayHost, ScreenId, Sheet, Toast } from '../components/ui'
import AccountSheet from './Account'

export default function RenterLayout() {
  const loc = useLocation()
  const main = useRef(null)

  useEffect(() => {
    main.current?.scrollTo(0, 0)
    // North Star: one page_view per visitor per day (#32)
    const s = useStore.getState()
    const visitor = s.renterId || s.guestId
    const day = dateOf(s.now)
    const seen = s.data.events.some((e) => e.name === 'page_view' && e.visitor_id === visitor && dateOf(e.time) === day)
    if (!seen) s.logEvent('page_view', { visitor_id: visitor, path: loc.pathname })
  }, [loc.pathname])

  return (
    <div className="min-h-dvh sm:grid sm:place-items-center sm:py-6">
      {/* iPhone bezel on desktop; full screen on a real phone */}
      <div className="mx-auto sm:rounded-[58px] sm:bg-[#1b1b1d] sm:p-[11px] sm:shadow-[0_30px_80px_rgba(16,24,40,0.28),inset_0_0_0_1.5px_#3a3a3d]">
        <div className="relative isolate h-dvh w-full overflow-hidden bg-white [--screen-h:100dvh] sm:h-[min(844px,calc(100dvh-70px))] sm:w-[390px] sm:rounded-[47px] sm:[--screen-h:min(844px,calc(100dvh-70px))]">
          <OverlayHost>
            <div className="absolute top-[11px] left-1/2 z-50 hidden h-[34px] w-[120px] -translate-x-1/2 rounded-full bg-black sm:block" aria-hidden="true" />
            <TopBar />
            <main
              ref={main}
              className="no-scrollbar absolute inset-0 snap-y snap-proximity scroll-pt-[calc(52px+var(--app-top))] overflow-x-hidden overflow-y-auto pt-[calc(52px+var(--app-top))] pb-24 sm:scroll-pt-[104px] sm:pt-[104px] sm:pb-28"
            >
              <div key={loc.pathname} className="animate-screen">
                <Outlet />
              </div>
            </main>
            <TabBar />
            <div className="absolute bottom-2 left-1/2 z-50 hidden h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-black/85 sm:block" aria-hidden="true" />
            <LoginGate />
            <Toast />
            <NotificationBanner />
          </OverlayHost>
        </div>
      </div>
    </div>
  )
}

/** Status bar (desktop frame only) + frosted navigation bar. Content scrolls underneath. */
function TopBar() {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const now = useStore((s) => s.now)
  const setLang = useStore((s) => s.setLang)
  const renterId = useStore((s) => s.renterId)
  const data = useStore((s) => s.data)
  const me = data.renters.find((r) => r.id === renterId)
  const pn = usePersonName()
  const [account, setAccount] = useState(false)
  const unread = data.notifications.some((n) => n.renter_id === renterId && !n.read)
  return (
    <header className="absolute inset-x-0 top-0 z-30 border-b border-black/[0.06] bg-white/80 pt-[var(--app-top)] backdrop-blur-xl backdrop-saturate-150 sm:pt-0">
      <div className="hidden h-[52px] items-center justify-between px-8 pt-1 sm:flex" dir="ltr" aria-hidden="true">
        <span className="w-14 text-center text-[16px] font-semibold tracking-tight">{hm(minOfDay(now))}</span>
        <StatusIcons />
      </div>
      <div className="flex h-[52px] items-center gap-1 px-4">
        <Link to="/r/home" aria-label={t('nav.home')} className="flex min-h-11 items-center" onClick={openPanelOnTripleTap}>
          <TechnoparkLogo />
        </Link>
        <div className="flex-1" />
        {/* Signed-in renters change language in Account; guests get a quick switch here */}
        {!me && (
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="min-h-11 px-2.5 text-[15px] font-medium text-navy"
            aria-label={t('common.switch_lang')}
          >
            {lang === 'en' ? 'عربي' : 'EN'}
          </button>
        )}
        {me && (
          <Link to="/r/notifications" className="relative grid size-11 place-items-center text-navy" aria-label={t('nav.notifications')}>
            <Icon name="bell" />
            {unread && <span className="absolute end-[11px] top-[10px] size-2 rounded-full bg-red ring-2 ring-white" />}
          </Link>
        )}
        {me ? (
          <button onClick={() => setAccount(true)} className="grid size-11 place-items-center rounded-full active:bg-black/[0.06]" aria-label={t('nav.account')}>
            <span className="grid size-8 place-items-center rounded-full bg-navy text-[14px] font-semibold text-white">{pn(me)[0]}</span>
          </button>
        ) : (
          <Link to="/r/login" className="ms-1 min-h-9 content-center rounded-full bg-navy px-4 text-[15px] font-semibold text-white">
            {t('nav.login')}
          </Link>
        )}
      </div>
      {me && <AccountSheet open={account} onClose={() => setAccount(false)} />}
    </header>
  )
}

/**
 * Drops in from the top when a new alert reaches the signed-in renter, e.g. reception replied to a report
 * (possibly from another tab, such as the reception side of the demo). Tapping it opens what it's about.
 */
function NotificationBanner() {
  const { t } = useTranslation()
  const tpl = useTemplate()
  const [note, setNote] = useState(null)

  useEffect(
    () =>
      useStore.subscribe((st, prev) => {
        if (!st.renterId || st.renterId !== prev.renterId || st.data.notifications === prev.data.notifications) return
        const before = new Set(prev.data.notifications.map((n) => n.id))
        const fresh = st.data.notifications.filter((n) => n.renter_id === st.renterId && !n.read && !before.has(n.id))
        if (fresh.length) setNote(fresh[fresh.length - 1])
      }),
    [],
  )
  useEffect(() => {
    if (!note) return
    const id = setTimeout(() => setNote(null), 6000)
    return () => clearTimeout(id)
  }, [note])

  if (!note) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(6px+var(--app-top))] z-50 flex justify-center px-3 sm:top-[56px]" role="status">
      <Link
        key={note.id}
        to={note.link || '/r/notifications'}
        onClick={() => setNote(null)}
        className="animate-drop pointer-events-auto flex w-full items-start gap-3 rounded-[22px] bg-white/90 p-3.5 text-start shadow-[0_12px_40px_rgba(16,24,40,0.22)] ring-1 ring-black/[0.06] backdrop-blur-xl"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy text-white">
          <Icon name={NOTIF_ICON[note.kind] || 'bell'} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold">{t(`notif.kind_${note.kind}`)}</span>
            <span className="shrink-0 text-[13px] text-grey-ink">{t('notif.now')}</span>
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[15px] leading-snug text-ink">{tpl(note.tpl, note.params)}</span>
        </span>
      </Link>
    </div>
  )
}

function StatusIcons() {
  return (
    <span className="flex w-20 items-center justify-end gap-1.5 text-ink">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="10" y="3" width="3" height="9" rx="1" />
        <rect x="15" y="0" width="3" height="12" rx="1" />
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
        <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.1-1.1A10 10 0 0 0 8 .6 10 10 0 0 0 .9 3.5L2 4.6a8.5 8.5 0 0 1 6-2.4Zm0 3.2c1.4 0 2.7.5 3.7 1.4l1.1-1.1A7 7 0 0 0 8 3.8a7 7 0 0 0-4.8 1.9l1.1 1.1c1-.9 2.3-1.4 3.7-1.4Zm0 3.2c.6 0 1.1.2 1.5.6L8 10.7 6.5 9.2c.4-.4.9-.6 1.5-.6Z" />
      </svg>
      <svg width="27" height="13" viewBox="0 0 27 13">
        <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4" />
        <rect x="2" y="2" width="17" height="9" rx="2.5" fill="currentColor" />
        <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity=".45" />
      </svg>
    </span>
  )
}

function TabBar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  // Today = know before you go (and book today); Book ahead = later days and repeats; My bookings = sit where you booked.
  const tabs = [
    { key: 'today', icon: 'sun', match: ['/r/home'], open: () => navigate('/r/home') },
    { key: 'ahead', icon: 'calendar', match: ['/r/list'], open: () => navigate('/r/list') },
    { key: 'bookings', icon: 'ticket', match: ['/r/bookings'], open: () => requireLogin('/r/bookings') },
  ]
  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-black/[0.06] bg-white/75 pb-1 backdrop-blur-xl backdrop-saturate-150 sm:pb-6"
      aria-label={t('nav.tabs')}
    >
      {tabs.map((tab) => {
        const active = tab.match.some((m) => pathname.startsWith(m))
        return (
          <button
            key={tab.key}
            onClick={tab.open}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 text-[12px] font-medium transition-colors ${active ? 'text-navy' : 'text-grey-ink'}`}
          >
            <Icon name={tab.icon} size={25} className={active ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
            {t(`nav.${tab.key}`)}
          </button>
        )
      })}
    </nav>
  )
}

/** R-09 Login gate */
function LoginGate() {
  const { t } = useTranslation()
  const gate = useStore((s) => s.gate)
  const set = useStore((s) => s.set)
  const navigate = useNavigate()
  const go = (to) => {
    set({ returnTo: gate.returnTo, gate: null })
    navigate(to)
  }
  return (
    <Sheet open={!!gate} onClose={() => set({ gate: null })} title={t('gate.title')}>
      <ScreenId id="R-09" />
      <p className="mb-4 text-grey-ink">{t('gate.body')}</p>
      <div className="grid gap-2">
        <button className="btn-primary" onClick={() => go('/r/signup')}>
          {t('gate.signup')}
        </button>
        <button className="btn-secondary" onClick={() => go('/r/login')}>
          {t('gate.login')}
        </button>
      </div>
    </Sheet>
  )
}

/** Shown in place of a renter-only screen when nobody is logged in. */
export function NeedLogin({ returnTo }) {
  const { t } = useTranslation()
  const set = useStore((s) => s.set)
  return (
    <div className="p-6 text-center">
      <Icon name="lock" className="mx-auto mb-2 text-grey-ink" size={32} />
      <p className="mb-4 text-grey-ink">{t('gate.body')}</p>
      <button className="btn-primary" onClick={() => set({ gate: { returnTo } })}>
        {t('nav.login')}
      </button>
    </div>
  )
}
