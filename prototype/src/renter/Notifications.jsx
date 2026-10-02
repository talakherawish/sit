import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useTemplate } from '../lib/hooks'
import { NOTIF_ICON, dateOf, minOfDay, renter as findRenter } from '../lib/logic'
import { fmtDate, hm } from '../lib/time'
import { Empty, ScreenTitle } from '../components/ui'
import Icon from '../components/Icon'
import { NeedLogin } from './RenterLayout'

/** R-18 Notifications (#21, #24) */
export function Notifications() {
  const { t } = useTranslation()
  const tpl = useTemplate()
  const s = useStore()
  const me = findRenter(s.data, s.renterId)
  const list = me ? s.data.notifications.filter((n) => n.renter_id === me.id).sort((a, b) => b.time - a.time) : []
  const [unread] = useState(() => new Set(list.filter((n) => !n.read).map((n) => n.id)))
  useEffect(() => {
    if (me) s.markNotificationsRead(me.id)
  }, [me?.id, list.length]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!me) return <NeedLogin returnTo="/r/notifications" />
  const action = (n) =>
    ({
      cancel: t('notif.book_another'),
      report: t('notif.see_report'),
      reminder: t('notif.open_reminder'),
      notice: t('notif.see_map'),
      release: t('notif.see_bookings'),
      booking: t('notif.see_bookings'),
    })[n.kind]
  const when = (time) => (dateOf(time) === dateOf(s.now) ? hm(minOfDay(time)) : fmtDate(dateOf(time), s.lang, { day: 'numeric', month: 'short' }))
  return (
    <>
      <ScreenTitle id="R-18" title={t('notif.title')} back />
      <div className="space-y-6 px-4">
        {!list.length && <Empty>{t('notif.none')}</Empty>}
        {[
          ['new', list.filter((n) => unread.has(n.id))],
          ['earlier', list.filter((n) => !unread.has(n.id))],
        ]
          .filter(([, group]) => group.length)
          .map(([key, group]) => (
            <section key={key}>
              <h2 className="px-1 pb-1.5 text-[15px] font-semibold">{t(`notif.${key}`)}</h2>
              <div className="divide-y divide-black/[0.07] overflow-hidden rounded-[22px] bg-surface">
                {group.map((n) => (
                  <Link key={n.id} to={n.link || '/r/home'} className="flex gap-3 px-4 py-3.5 active:bg-black/[0.04]">
                    <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-white text-navy">
                      <Icon name={NOTIF_ICON[n.kind] || 'bell'} size={20} />
                      {unread.has(n.id) && <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full bg-red ring-2 ring-surface" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[15px] font-semibold">{t(`notif.kind_${n.kind}`)}</span>
                        <span className="shrink-0 text-[13px] text-grey-ink">{when(n.time)}</span>
                      </span>
                      <span className="mt-0.5 block text-[15px] leading-snug text-ink">{tpl(n.tpl, n.params)}</span>
                      <span className="mt-1.5 flex items-center gap-1 text-[15px] font-medium text-navy">
                        {action(n)}
                        <Icon name="next" size={14} className="rtl:rotate-180" />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
      </div>
    </>
  )
}
