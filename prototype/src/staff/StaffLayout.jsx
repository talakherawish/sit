import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { fmtAbs } from '../lib/time'
import Icon, { TechnoparkLogo } from '../components/Icon'
import { PhaseBadge, Toast } from '../components/ui'

const NAV = [
  { to: '/s/today', key: 'today', icon: 'home' },
  { to: '/s/checkin', key: 'checkin', icon: 'door' },
  { to: '/s/notices', key: 'notices', icon: 'megaphone' },
  { to: '/s/reports', key: 'reports', icon: 'inbox', phase: 'next' },
  { to: '/s/book-for', key: 'bookings', icon: 'calendar', phase: 'next' },
  { to: '/s/insights', key: 'insights', icon: 'chart', phase: 'later' },
  { to: '/s/settings/rooms', key: 'settings', icon: 'gear', match: '/s/settings' },
]

export default function StaffLayout() {
  const { t } = useTranslation()
  const reception = useStore((s) => s.receptionDevice)
  const lang = useStore((s) => s.lang)
  const setLang = useStore((s) => s.setLang)
  const seats = useStore((s) => s.data.seats)
  const now = useStore((s) => s.now)
  const { pathname } = useLocation()
  const newReports = useStore((s) => s.data.reports.filter((r) => r.status === 'sent').length)

  if (!reception) {
    // S-00 Device check (#13)
    return (
      <div className="grid min-h-dvh place-items-center bg-surface p-6">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow ring-1 ring-grey/20">
          <p className="text-xs text-grey-ink">S-00</p>
          <Icon name="lock" size={40} className="mx-auto mb-3 text-navy" />
          <h1 className="font-head text-2xl font-bold">{t('staff.device_title')}</h1>
          <p className="mt-2 text-grey-ink">{t('staff.device_body')}</p>
          <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="btn-link mt-4">
            {lang === 'en' ? 'عربي' : 'English'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh bg-surface">
      <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col bg-navy text-white">
        <div className="border-b border-white/15 p-5">
          <TechnoparkLogo light />
        </div>
        <p className="px-5 pt-4 pb-2 font-head text-lg font-semibold">Sit · {t('staff.desk')}</p>
        <nav className="flex-1 space-y-1 px-3" aria-label={t('staff.nav')}>
          {NAV.map((n) => (
            <NavLink
              key={n.key}
              to={n.to}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium ${isActive || (n.match && pathname.startsWith(n.match)) ? 'bg-white text-navy' : 'text-white hover:bg-white/10'}`
              }
            >
              <Icon name={n.icon} size={20} />
              <span className="flex-1">{t(`staff.nav_${n.key}`)}</span>
              {n.key === 'reports' && newReports > 0 && <span className="rounded-full bg-orange px-2 text-xs font-bold text-white">{newReports}</span>}
              {n.phase && <span className="rounded-full bg-white/20 px-2 text-xs">{t(`phase.${n.phase}`)}</span>}
            </NavLink>
          ))}
        </nav>
        <p className="p-5 text-xs text-white/80">{t('staff.reception_pc')}</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-grey/15 bg-white px-6">
          <span className="text-sm text-grey-ink">{fmtAbs(now, lang)}</span>
          <div className="flex-1" />
          <NavLink
            to="/s/today"
            className="flex items-center gap-2 rounded-full bg-orange/10 px-4 py-1.5 ring-1 ring-orange"
            aria-label={t('home.seats_aria', { taken: seats.taken, total: seats.total })}
          >
            <Icon name="seat" size={20} className="text-orange" />
            <span className="font-head text-xl font-bold" dir="ltr">
              {seats.taken} / {seats.total}
            </span>
            <span className="text-sm">{t('staff.open_area')}</span>
          </NavLink>
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="min-h-11 rounded-lg px-3 font-semibold text-navy"
            aria-label={t('common.switch_lang')}
          >
            {lang === 'en' ? 'عربي' : 'English'}
          </button>
          <span className="flex items-center gap-2 text-sm">
            <span className="grid size-9 place-items-center rounded-full bg-teal font-semibold text-white">R</span>Rana · {t('staff.reception')}
          </span>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <Toast fixed />
    </div>
  )
}

export function StaffTitle({ id, title, phase, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="flex-1">
        <p className="text-xs text-grey-ink">{id}</p>
        <h1 className="font-head text-3xl font-bold">
          {title} {phase && <PhaseBadge phase={phase} />}
        </h1>
      </div>
      {children}
    </div>
  )
}
