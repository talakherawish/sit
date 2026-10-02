import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useSpaceName, useTemplate } from '../lib/hooks'
import { ISSUE_TYPES, dateOf, endAbs, minOfDay, startAbs, renter as findRenter } from '../lib/logic'
import { fmtAbs, fmtDate, hm } from '../lib/time'
import { Card, Chip, Empty, Field, PhaseBadge, ScreenTitle, StatusChip } from '../components/ui'
import Icon from '../components/Icon'
import { NeedLogin } from './RenterLayout'

/** R-16 Report an issue (#22) */
export function Report() {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const s = useStore()
  const me = findRenter(s.data, s.renterId)
  const [where, setWhere] = useState(s.reportSpace || 'public')
  const [type, setType] = useState(null)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState(null)
  if (!me) return <NeedLogin returnTo="/r/report" />
  const send = (e) => {
    e.preventDefault()
    s.sendReport({ renter_id: me.id, space_id: where, type, note: note.trim(), photo })
    s.set({ reportSpace: null })
    s.showToast('toast.report_sent')
    navigate('/r/reports')
  }
  return (
    <>
      <ScreenTitle id="R-16" title={t('report.title')} phase="next">
        <Link to="/r/reports" className="btn-link shrink-0 text-sm">
          {t('report.mine')}
        </Link>
      </ScreenTitle>
      <form onSubmit={send} className="space-y-4 px-4">
        <Field label={t('report.where')}>
          <select className="input" value={where} onChange={(e) => setWhere(e.target.value)}>
            <option value="public">{L(s.data.zones[0].name)}</option>
            {s.data.spaces.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {L(sp.label)}
              </option>
            ))}
          </select>
        </Field>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">{t('report.type')}</legend>
          <div className="flex flex-wrap gap-2">
            {ISSUE_TYPES.map((k) => (
              <Chip key={k} active={type === k} onClick={() => setType(k)}>
                {t(`issue.${k}`)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <Field label={t('report.note')} hint={`${note.length}/200`}>
          <textarea className="input min-h-24 py-2" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label={t('report.photo')}>
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm file:me-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-navy/10 file:px-4 file:font-semibold file:text-navy"
            onChange={(e) => setPhoto(e.target.files?.[0]?.name || null)}
          />
        </Field>
        <button className="btn-primary w-full" disabled={!type}>
          {t('report.send')}
        </button>
      </form>
    </>
  )
}

/** R-17 My reports (#23) */
export function MyReports() {
  const { t } = useTranslation()
  const name = useSpaceName()
  const s = useStore()
  const me = findRenter(s.data, s.renterId)
  if (!me) return <NeedLogin returnTo="/r/reports" />
  const mine = s.data.reports.filter((r) => r.renter_id === me.id)
  return (
    <>
      <ScreenTitle id="R-17" title={t('report.mine')} phase="next" back />
      <div className="space-y-3 px-4">
        <Link to="/r/report" className="btn-primary w-full">
          {t('report.new')}
        </Link>
        {!mine.length && <Empty>{t('report.none')}</Empty>}
        {mine.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">
                  {t(`issue.${r.type}`)} · {name(r.space_id)}
                </h2>
                {r.note && <p className="text-sm">{r.note}</p>}
              </div>
              <StatusChip status={r.status} label={t(`report_status.${r.status}`)} />
            </div>
            <ol className="mt-2 space-y-1 border-s-2 border-grey/20 ps-3 text-sm">
              {r.history.map((h, i) => (
                <li key={i}>
                  <span className="font-medium">{t(`report_status.${h.status}`)}</span> · <span className="text-grey-ink">{fmtAbs(h.time, s.lang)}</span>
                </li>
              ))}
            </ol>
            {r.reply && (
              <p className="mt-2 rounded-lg bg-surface p-2 text-sm">
                <span className="font-semibold">{t('report.staff_reply')}:</span> {r.reply}
              </p>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}

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
      <ScreenTitle id="R-18" title={t('notif.title')} phase="next" back />
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
                      {unread.has(n.id) && (
                        <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full bg-orange ring-2 ring-surface" aria-hidden="true" />
                      )}
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

const NOTIF_ICON = { booking: 'calendar', notice: 'megaphone', report: 'flag', cancel: 'close', reminder: 'bell', release: 'clock' }

/** R-19 Rate your visit (#28) */
export function Rate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const s = useStore()
  const me = findRenter(s.data, s.renterId)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [before, setBefore] = useState(null)
  if (!me) return <NeedLogin returnTo="/r/rate" />
  const send = (e) => {
    e.preventDefault()
    s.sendRating({ renter_id: me.id, visit_id: s.pendingRating[me.id] || null, stars, comment: comment.trim(), checked_sit_before: before })
    s.showToast('toast.thanks')
    navigate('/r/home')
  }
  return (
    <>
      <ScreenTitle id="R-19" title={t('rate.title')} phase="next" />
      <form onSubmit={send} className="space-y-5 px-4">
        <p>{t('rate.body', { name: me.name.split(' ')[0] })}</p>
        <fieldset>
          <legend className="mb-1 font-medium">{t('rate.stars')}</legend>
          <div className="flex gap-1" dir="ltr">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setStars(n)}
                aria-label={t('rate.n_stars', { count: n })}
                aria-pressed={stars >= n}
                className={`grid size-12 place-items-center ${stars >= n ? 'text-orange' : 'text-grey/50'}`}
              >
                <Icon name="star" size={36} filled={stars >= n} />
              </button>
            ))}
          </div>
        </fieldset>
        <Field label={t('rate.comment')}>
          <textarea className="input min-h-20 py-2" maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <fieldset>
          <legend className="mb-1 font-medium">{t('rate.checked_before')}</legend>
          <div className="flex gap-2">
            <Chip active={before === 'yes'} onClick={() => setBefore('yes')}>
              {t('common.yes')}
            </Chip>
            <Chip active={before === 'no'} onClick={() => setBefore('no')}>
              {t('common.no')}
            </Chip>
          </div>
        </fieldset>
        <button className="btn-primary w-full" disabled={!stars || !before}>
          {t('rate.send')}
        </button>
      </form>
    </>
  )
}

/** R-20 Profile and history (#29) */
export function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const name = useSpaceName()
  const s = useStore()
  const me = findRenter(s.data, s.renterId)
  if (!me) return <NeedLogin returnTo="/r/profile" />
  const past = s.data.bookings.filter((b) => b.renter_id === me.id && endAbs(b) <= s.now).sort((a, b) => startAbs(b) - startAbs(a))
  const upd = (patch) => s.updateRenter(me.id, patch)
  return (
    <>
      <ScreenTitle id="R-20" title={t('profile.title')} phase="later" />
      <div className="space-y-4 px-4">
        <Card>
          <div className="mb-3 flex items-center gap-3">
            <span className="grid size-14 place-items-center rounded-full bg-navy font-head text-2xl font-bold text-white">{me.name[0]}</span>
            <div>
              <p className="font-semibold">{me.name}</p>
              <p className="text-sm text-grey-ink" dir="ltr">
                {me.phone}
              </p>
              <p className="text-sm text-grey-ink">{me.email}</p>
            </div>
          </div>
          <div className="space-y-3">
            <Field label={t('profile.birthday')}>
              <input type="date" className="input" value={me.birthday || ''} onChange={(e) => upd({ birthday: e.target.value })} />
            </Field>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t('profile.contact')}</legend>
              <div className="flex flex-wrap gap-2">
                {['sms', 'email', 'whatsapp'].map((c) => (
                  <Chip key={c} active={me.preferred_contact === c} onClick={() => upd({ preferred_contact: c })}>
                    {t(`profile.${c}`)}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t('profile.language')}</legend>
              <div className="flex gap-2">
                <Chip
                  active={me.language === 'ar'}
                  onClick={() => {
                    upd({ language: 'ar' })
                    s.setLang('ar')
                  }}
                >
                  العربية
                </Chip>
                <Chip
                  active={me.language === 'en'}
                  onClick={() => {
                    upd({ language: 'en' })
                    s.setLang('en')
                  }}
                >
                  English
                </Chip>
              </div>
            </fieldset>
          </div>
        </Card>
        <section>
          <h2 className="mb-2 font-head text-xl font-bold">{t('profile.history')}</h2>
          {!past.length && <Empty>{t('bookings.none_past')}</Empty>}
          <div className="space-y-2">
            {past.map((b) => (
              <Link
                key={b.id}
                to={`/r/confirmed/${b.id}`}
                className="flex items-center justify-between gap-2 rounded-2xl bg-surface p-4 active:bg-black/[0.05]"
              >
                <span>
                  {name(b.space_id)}
                  <br />
                  <span className="text-sm text-grey-ink">
                    {fmtDate(b.date, s.lang)} ·{' '}
                    <span dir="ltr">
                      {hm(b.start)}–{hm(b.end)}
                    </span>
                  </span>
                </span>
                <StatusChip status={b.status} />
              </Link>
            ))}
          </div>
        </section>
        <div className="flex flex-wrap gap-2">
          <Link to="/r/reports" className="btn-secondary flex-1">
            {t('report.mine')} <PhaseBadge phase="next" />
          </Link>
          <button
            className="btn-danger flex-1"
            onClick={() => {
              s.loginAs(null)
              navigate('/r/home')
            }}
          >
            {t('profile.logout')}
          </button>
        </div>
      </div>
    </>
  )
}
