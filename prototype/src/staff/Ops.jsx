import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useSpaceName } from '../lib/hooks'
import { NOTICE_TAGS, hoursFor, dateOf, minOfDay } from '../lib/logic'
import { abs, fmtAbs, hm, parseHm } from '../lib/time'
import { Card, Chip, Confirm, Field, Switch } from '../components/ui'
import { StaffTitle } from './StaffLayout'

const TEMPLATES = {
  ac: [
    { en: 'AC is off today', ar: 'التكييف لا يعمل اليوم' },
    { en: 'AC is back on', ar: 'عاد التكييف للعمل' },
  ],
  wifi: [
    { en: 'Wifi slow this morning', ar: 'الواي فاي بطيء هذا الصباح' },
    { en: 'Wifi back to normal', ar: 'عاد الواي فاي للعمل بشكل طبيعي' },
  ],
  events: [{ en: 'Event in the hall 10:00–14:00', ar: 'فعالية في القاعة 10:00–14:00' }],
  other: [
    { en: 'Kitchen closed for cleaning until 12:00', ar: 'المطبخ مغلق للتنظيف حتى 12:00' },
    { en: 'All good today — enjoy your day', ar: 'كل شيء على ما يرام اليوم — يومًا موفقًا' },
  ],
}

/** S-04 Notices (#19, US-6) */
export function Notices() {
  const { t } = useTranslation()
  const L = useL()
  const name = useSpaceName()
  const s = useStore()
  const date = dateOf(s.now)
  const h = hoursFor(s.data, date) || { close: 18 * 60 }
  const postedToday = s.data.notices.some((n) => n.daily && !n.removed && dateOf(n.posted_at) === date)
  const [tag, setTag] = useState(null)
  const [text, setText] = useState(null) // { en, ar }
  const [spaceId, setSpaceId] = useState('')
  const [expires, setExpires] = useState('eod')
  const [custom, setCustom] = useState(hm(Math.min(h.close, minOfDay(s.now) + 240)))
  const [daily, setDaily] = useState(!postedToday)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)

  const expiresAt = expires === 'eod' ? abs(date, h.close) : expires === '2h' ? s.now + 120 : abs(date, parseHm(custom))
  const valid = tag && text && L(text).trim() && expiresAt > s.now
  const post = () => {
    s.postNotice({ tag, text, space_id: spaceId || null, expires_at: expiresAt, daily })
    s.showToast('toast.notice_posted')
    setTag(null)
    setText(null)
    setSpaceId('')
    setDaily(false)
  }
  const live = s.data.notices.filter((n) => !n.removed && n.expires_at > s.now).sort((a, b) => b.posted_at - a.posted_at)
  const earlier = s.data.notices.filter((n) => !n.removed && n.expires_at <= s.now).sort((a, b) => b.posted_at - a.posted_at)

  return (
    <>
      <StaffTitle id="S-04" title={t('notices.title')} />
      <div className="grid gap-5 xl:grid-cols-[480px_1fr]">
        <Card className="space-y-4 self-start">
          <h2 className="font-head text-xl font-bold">{t('notices.new')}</h2>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{t('notices.tag')}</legend>
            <div className="flex flex-wrap gap-2">
              {NOTICE_TAGS.map((k) => (
                <Chip
                  key={k}
                  active={tag === k}
                  onClick={() => {
                    setTag(k)
                    setText(null)
                  }}
                >
                  {t(`tag.${k}`)}
                </Chip>
              ))}
            </div>
          </fieldset>
          {tag && (
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t('notices.templates')}</legend>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES[tag].map((tp, i) => (
                  <Chip key={i} active={text === tp} onClick={() => setText(tp)}>
                    {L(tp)}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}
          <Field label={t('notices.text')}>
            <textarea
              className="input min-h-20 py-2"
              maxLength={140}
              value={text ? L(text) : ''}
              onChange={(e) => setText({ en: e.target.value, ar: e.target.value })}
            />
          </Field>
          <Field label={t('notices.room')}>
            <select className="input" value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
              <option value="">{t('notices.no_room')}</option>
              {s.data.spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {L(sp.label)}
                </option>
              ))}
            </select>
          </Field>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{t('notices.expires')}</legend>
            <div className="flex flex-wrap items-center gap-2">
              {['eod', '2h', 'custom'].map((k) => (
                <Chip key={k} active={expires === k} onClick={() => setExpires(k)}>
                  {t(`notices.exp_${k}`)}
                </Chip>
              ))}
              {expires === 'custom' && (
                <input type="time" className="input !w-36" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label={t('notices.exp_custom')} />
              )}
            </div>
          </fieldset>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-[15px]">{t('notices.daily')}</span>
            <Switch checked={daily} onChange={setDaily} label={t('notices.daily')} />
          </div>
          <p className="text-sm text-grey-ink">{t('notices.alert_hint')}</p>
          <button className="btn-primary w-full" disabled={!valid} onClick={post}>
            {t('notices.post')}
          </button>
        </Card>
        <div className="space-y-5">
          <Card>
            <h2 className="mb-2 font-head text-xl font-bold">{t('notices.live')}</h2>
            {!live.length && <p className="text-grey-ink">{t('staff.no_notices')}</p>}
            <ul className="divide-y divide-black/[0.06]">
              {live.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-60 flex-1">
                    <p className="text-sm text-grey-ink">
                      <b className="text-ink">{t(`tag.${n.tag}`)}</b> · {t('notices.posted_at', { time: fmtAbs(n.posted_at, s.lang) })} ·{' '}
                      {t('notices.until', { time: hm(minOfDay(n.expires_at)) })}
                      {n.space_id && ` · ${name(n.space_id)}`}
                      {n.daily && ` · ${t('notices.daily_short')}`}
                      {n.edited_at && ` · ${t('notices.edited')}`}
                    </p>
                    {editing?.id === n.id ? (
                      <input
                        className="input mt-1"
                        value={editing.text}
                        onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                        aria-label={t('notices.text')}
                      />
                    ) : (
                      <p>{L(n.text)}</p>
                    )}
                  </div>
                  {editing?.id === n.id ? (
                    <>
                      <button className="btn-secondary" onClick={() => setEditing(null)}>
                        {t('common.back')}
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          s.editNotice(n.id, editing.text)
                          setEditing(null)
                        }}
                      >
                        {t('common.save')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-secondary" onClick={() => setEditing({ id: n.id, text: L(n.text) })}>
                        {t('common.edit')}
                      </button>
                      <button className="btn-danger" onClick={() => setRemoving(n)}>
                        {t('common.remove')}
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-2 font-head text-xl font-bold text-grey-ink">{t('notices.earlier')}</h2>
            <ul className="space-y-1 text-grey-ink">
              {earlier.map((n) => (
                <li key={n.id}>
                  {fmtAbs(n.posted_at, s.lang)} · <b>{t(`tag.${n.tag}`)}</b> · {L(n.text)}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <Confirm
        open={!!removing}
        title={t('notices.remove_title')}
        body={removing ? L(removing.text) : ''}
        okLabel={t('common.remove')}
        danger
        onOk={() => {
          s.removeNotice(removing.id)
          setRemoving(null)
        }}
        onCancel={() => setRemoving(null)}
      />
    </>
  )
}
