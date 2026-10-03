import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { usePersonName } from '../lib/hooks'
import { renter as findRenter } from '../lib/logic'
import { Segmented, Sheet } from '../components/ui'
import Icon from '../components/Icon'

/**
 * Account, opened from the avatar: who you are, language, your reports and "Report a problem".
 * A small first slice of the Profile planned for a later sprint (birthday, contact preference and
 * booking history stay out for now).
 */
export default function AccountSheet({ open, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pn = usePersonName()
  const s = useStore()
  const me = findRenter(s.data, s.renterId)
  if (!me) return null

  const go = (to, patch) => {
    if (patch) s.set(patch)
    onClose()
    navigate(to)
  }
  const setLanguage = (lang) => {
    s.updateRenter(me.id, { language: lang })
    s.setLang(lang)
  }
  const unreadReports = s.data.notifications.some((n) => n.renter_id === me.id && n.kind === 'report' && !n.read)

  return (
    <Sheet open={open} onClose={onClose} title={t('account.title')}>
      <div className="mb-6 flex items-center gap-4 px-1">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-navy text-[22px] font-semibold text-white">{pn(me)[0]}</span>
        <span className="min-w-0">
          <span className="block truncate text-[20px] font-semibold">{pn(me)}</span>
          <span className="block truncate text-[15px] text-grey-ink" dir="ltr">
            {[me.phone, me.email].filter(Boolean).join(' · ')}
          </span>
        </span>
      </div>

      <section className="mb-6">
        <h3 className="mb-1.5 flex items-center gap-2 px-1 text-[15px] font-semibold">
          <Icon name="globe" size={16} className="text-navy" />
          {t('profile.language')}
        </h3>
        <Segmented
          label={t('profile.language')}
          value={s.lang}
          onChange={setLanguage}
          options={[
            ['en', 'English'],
            ['ar', 'عربي'],
          ]}
        />
      </section>

      <div className="space-y-3">
        <button
          onClick={() => go('/r/reports')}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-surface px-4 text-start active:bg-black/[0.06]"
        >
          <Icon name="inbox" size={20} className="shrink-0 text-navy" />
          <span className="flex-1 text-[17px]">{t('report.mine')}</span>
          {unreadReports && <span className="size-2 rounded-full bg-red" aria-label={t('account.new_reply')} />}
          <Icon name="next" size={16} className="shrink-0 text-grey-ink/60 rtl:rotate-180" />
        </button>

        {/* Soft red so it's easy to find when something is wrong; Log out below stays plain so there aren't two red rows */}
        <button
          onClick={() => go('/r/report', { reportSpace: null, reportBooking: null })}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-red/10 px-4 text-start text-[#a32f2f] active:bg-red/15"
        >
          <Icon name="flag" size={20} className="shrink-0" />
          <span className="flex-1 text-[17px] font-semibold">{t('account.report')}</span>
          <Icon name="next" size={16} className="shrink-0 opacity-60 rtl:rotate-180" />
        </button>
      </div>

      <button
        onClick={() => {
          s.loginAs(null)
          go('/r/home')
        }}
        className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-[17px] font-medium text-grey-ink active:bg-black/[0.04]"
      >
        <Icon name="logout" size={18} className="rtl:rotate-180" />
        {t('profile.logout')}
      </button>
    </Sheet>
  )
}
