import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { fmtAbs } from '../lib/time'
import { STAFF, openPanelOnTripleTap, usePersonName } from '../lib/hooks'
import Icon, { TechnoparkLogo } from '../components/Icon'
import { PhaseBadge, ScreenId, Toast } from '../components/ui'

const NAV = [
  { to: '/s/today', key: 'today', icon: 'home' },
  { to: '/s/checkin', key: 'checkin', icon: 'door' },
  { to: '/s/people', key: 'people', icon: 'people' },
  { to: '/s/notices', key: 'notices', icon: 'megaphone' },
  { to: '/s/reports', key: 'reports', icon: 'inbox' },
  { to: '/s/settings/rooms', key: 'settings', icon: 'gear', match: '/s/settings' },
]

export default function StaffLayout() {
  const pn = usePersonName()
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
      <div className="grid min-h-dvh place-items-center bg-white p-6">
        <div className="max-w-md rounded-3xl bg-surface p-10 text-center">
          <ScreenId id="S-00" />
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
    <div className="flex min-h-dvh bg-white">
      {/* Source-list sidebar, macOS style */}
      <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col border-e border-black/[0.06] bg-surface">
        <div className="px-5 pt-6 pb-5">
          <button onClick={openPanelOnTripleTap} aria-label="Technopark Palestine">
            <TechnoparkLogo />
          </button>
        </div>
        <p className="px-5 pb-2 text-[13px] font-medium text-grey-ink">{t('staff.desk')}</p>
        <nav className="flex-1 space-y-0.5 px-3" aria-label={t('staff.nav')}>
          {NAV.map((n) => (
            <NavLink
              key={n.key}
              to={n.to}
              className={({ isActive }) =>
                `flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] ${
                  isActive || (n.match && pathname.startsWith(n.match)) ? 'bg-black/[0.07] font-semibold text-ink' : 'text-ink hover:bg-black/[0.04]'
                }`
              }
            >
              <Icon name={n.icon} size={19} className="text-navy" />
              <span className="flex-1">{t(`staff.nav_${n.key}`)}</span>
              {n.key === 'reports' && newReports > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red px-1.5 text-[12px] font-semibold text-white">{newReports}</span>
              )}
              {n.phase && <PhaseBadge phase={n.phase} />}
            </NavLink>
          ))}
        </nav>
        <p className="px-5 py-5 text-[12px] text-grey-ink">{t('staff.reception_pc')}</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-black/[0.06] bg-white/80 px-8 backdrop-blur-xl backdrop-saturate-150">
          <span className="text-[13px] text-grey-ink">{fmtAbs(now, lang)}</span>
          <div className="flex-1" />
          <NavLink
            to="/s/today"
            className="flex min-h-9 items-center gap-2 rounded-full bg-surface px-3.5"
            aria-label={t('home.seats_aria', { taken: seats.taken, total: seats.total })}
          >
            <span className="live-dot size-2 rounded-full bg-teal" aria-hidden="true" />
            <span className="text-[15px] font-semibold text-[#2f5656] tabular-nums">{t('home.seats_free', { count: seats.total - seats.taken })}</span>
            <span className="text-[13px] text-grey-ink" dir="ltr">
              · {seats.taken} / {seats.total}
            </span>
          </NavLink>
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="min-h-9 rounded-full px-3 text-[15px] font-medium text-navy hover:bg-black/[0.04]"
            aria-label={t('common.switch_lang')}
          >
            {lang === 'en' ? 'عربي' : 'English'}
          </button>
          <span className="flex items-center gap-2 text-[13px] text-grey-ink">
            <span className="grid size-8 place-items-center rounded-full bg-teal text-[14px] font-semibold text-white">{pn(STAFF)[0]}</span>
            <span>
              <span className="block text-[14px] font-medium text-ink">{pn(STAFF)}</span>
              {t('staff.reception')}
            </span>
          </span>
        </header>
        <main key={pathname} className="animate-screen w-full max-w-[1320px] flex-1 px-8 py-7">
          <Outlet />
        </main>
      </div>
      <Toast fixed />
    </div>
  )
}

export function StaffTitle({ id, title, phase, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <div className="flex-1">
        <h1 className="font-head text-[34px] leading-tight font-bold">
          {title} {phase && <PhaseBadge phase={phase} />}
        </h1>
        <ScreenId id={id} className="mt-0.5" />
      </div>
      {children}
    </div>
  )
}
