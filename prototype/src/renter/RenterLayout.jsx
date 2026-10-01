import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useRequireLogin } from '../lib/hooks'
import { dateOf } from '../lib/logic'
import Icon, { SitMark } from '../components/Icon'
import { ScreenId, Sheet, Toast } from '../components/ui'

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
      <div className="relative mx-auto flex h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-surface sm:h-[min(844px,calc(100dvh-48px))] sm:rounded-[32px] sm:shadow-2xl sm:ring-[10px] sm:ring-ink">
        <Header />
        <main ref={main} className="no-scrollbar flex-1 overflow-x-hidden overflow-y-auto pb-6">
          <Outlet />
        </main>
        <TabBar />
        <LoginGate />
        <Toast />
      </div>
    </div>
  )
}

function Header() {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const setLang = useStore((s) => s.setLang)
  const renterId = useStore((s) => s.renterId)
  const data = useStore((s) => s.data)
  const me = data.renters.find((r) => r.id === renterId)
  const unread = data.notifications.some((n) => n.renter_id === renterId && !n.read)
  return (
    <header className="z-10 flex h-14 shrink-0 items-center gap-1 border-b border-grey/15 bg-white px-3">
      <Link to="/r/home" aria-label={t('nav.home')} className="flex min-h-11 items-center">
        <SitMark />
      </Link>
      <div className="flex-1" />
      <button
        onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
        className="min-h-11 rounded-lg px-2.5 text-sm font-semibold text-navy"
        aria-label={t('common.switch_lang')}
      >
        {lang === 'en' ? 'عربي' : 'English'}
      </button>
      {me && (
        <Link to="/r/notifications" className="relative grid size-11 place-items-center text-navy" aria-label={t('nav.notifications')}>
          <Icon name="bell" />
          {unread && <span className="absolute end-2.5 top-2.5 size-2.5 rounded-full bg-orange ring-2 ring-white" />}
        </Link>
      )}
      {me ? (
        <Link to="/r/profile" className="grid size-11 place-items-center" aria-label={t('nav.profile')}>
          <span className="grid size-9 place-items-center rounded-full bg-navy font-semibold text-white">{me.name[0]}</span>
        </Link>
      ) : (
        <Link to="/r/login" className="min-h-11 content-center rounded-lg px-3 font-semibold text-navy">
          {t('nav.login')}
        </Link>
      )}
    </header>
  )
}

function TabBar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  const tabs = [
    { key: 'map', icon: 'map', to: '/r/home', match: ['/r/home'], open: () => navigate('/r/home') },
    { key: 'list', icon: 'list', to: '/r/list', match: ['/r/list'], open: () => navigate('/r/list') },
    { key: 'bookings', icon: 'calendar', match: ['/r/bookings'], open: () => requireLogin('/r/bookings') },
    { key: 'report', icon: 'flag', match: ['/r/report'], open: () => requireLogin('/r/report') },
  ]
  return (
    <nav className="z-10 grid shrink-0 grid-cols-4 border-t border-grey/15 bg-white pb-1" aria-label={t('nav.tabs')}>
      {tabs.map((tab) => {
        const active = tab.match.some((m) => pathname.startsWith(m))
        return (
          <button
            key={tab.key}
            onClick={tab.open}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${active ? 'text-orange' : 'text-grey-ink'}`}
          >
            <Icon name={tab.icon} />
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
