import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, useSpaceName } from '../lib/hooks'
import { ACTIVE, NOTICE_TAGS, hoursFor, normPhone, startAbs, dateOf, minOfDay, renter as findRenter } from '../lib/logic'
import { abs, fmtAbs, fmtDate, hm, parseHm, addDays } from '../lib/time'
import BookingForm from '../components/BookingForm'
import { Card, Chip, Confirm, Field, StatusChip, Switch } from '../components/ui'
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

/** S-05 Reports inbox (#22, #23) */
export function ReportsInbox() {
  const { t } = useTranslation()
  const name = useSpaceName()
  const s = useStore()
  const [edits, setEdits] = useState({})
  return (
    <>
      <StaffTitle id="S-05" title={t('inbox.title')} phase="next" />
      <Card>
        <table className="w-full">
          <thead className="text-[13px] font-medium text-grey-ink">
            <tr className="border-b border-black/[0.08]">
              {['time', 'renter', 'place', 'type', 'note', 'status', 'reply', ''].map((c) => (
                <th key={c} className="py-2 text-start">
                  {c && t(`inbox.col_${c}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.data.reports.map((r) => {
              const e = edits[r.id] || { status: r.status, reply: r.reply || '' }
              const dirty = e.status !== r.status || e.reply !== (r.reply || '')
              return (
                <tr key={r.id} className={`border-b border-black/[0.06] align-top ${r.status === 'sent' ? 'bg-orange/5' : ''}`}>
                  <td className="py-3 text-sm">{fmtAbs(r.history[0].time, s.lang)}</td>
                  <td className="font-medium">{findRenter(s.data, r.renter_id)?.name}</td>
                  <td>{name(r.space_id)}</td>
                  <td>{t(`issue.${r.type}`)}</td>
                  <td className="max-w-64 text-sm">
                    {r.note}
                    {r.photo && <span className="block text-grey-ink">📎 {r.photo}</span>}
                  </td>
                  <td>
                    <StatusChip status={r.status} label={t(`report_status.${r.status}`)} />
                    <select
                      className="input mt-1 !min-h-10 !w-36"
                      value={e.status}
                      onChange={(ev) => setEdits({ ...edits, [r.id]: { ...e, status: ev.target.value } })}
                      aria-label={t('inbox.col_status')}
                    >
                      {['sent', 'seen', 'in_progress', 'fixed'].map((k) => (
                        <option key={k} value={k} disabled={k === 'sent' && r.status !== 'sent'}>
                          {t(`report_status.${k}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="input !min-h-10"
                      value={e.reply}
                      placeholder={t('inbox.reply_ph')}
                      onChange={(ev) => setEdits({ ...edits, [r.id]: { ...e, reply: ev.target.value } })}
                      aria-label={t('inbox.col_reply')}
                    />
                  </td>
                  <td>
                    <button
                      className="btn-primary !min-h-10 !text-base"
                      disabled={!dirty}
                      onClick={() => {
                        s.updateReport(r.id, e.status, e.reply)
                        setEdits({ ...edits, [r.id]: undefined })
                        s.showToast('toast.report_updated')
                      }}
                    >
                      {t('common.save')}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </>
  )
}

/** S-06 Room down + cancel with notice (#21) */
export function RoomDown() {
  const { t } = useTranslation()
  const L = useL()
  const navigate = useNavigate()
  const s = useStore()
  const [params] = useSearchParams()
  const [spaceId, setSpaceId] = useState(params.get('space') || s.data.spaces[0].id)
  const date0 = dateOf(s.now)
  const [date, setDate] = useState(date0)
  const h = hoursFor(s.data, date) || { open: 480, close: 1080 }
  const [from, setFrom] = useState(Math.max(h.open, Math.floor(minOfDay(s.now) / 30) * 30))
  const [to, setTo] = useState(h.close)
  const [reason, setReason] = useState('')
  const affected = s.data.bookings.filter((b) => b.space_id === spaceId && b.date === date && ACTIVE.includes(b.status) && b.start < to && from < b.end)
  const [unchecked, setUnchecked] = useState({})
  const times = []
  for (let m = h.open; m <= h.close; m += 30) times.push(m)
  const days = Array.from({ length: 14 }, (_, i) => addDays(date0, i)).filter((d) => hoursFor(s.data, d))
  const go = () => {
    s.markRoomDown({ spaceId, date, from, to, reason: reason.trim(), bookingIds: affected.filter((b) => !unchecked[b.id]).map((b) => b.id) })
    s.showToast('toast.room_down')
    navigate('/s/today')
  }
  return (
    <>
      <StaffTitle id="S-06" title={t('down.title')} phase="next" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4 self-start">
          <Field label={t('book.room')}>
            <select className="input" value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
              {s.data.spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {L(sp.label)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('book.date')}>
            <select className="input" value={date} onChange={(e) => setDate(e.target.value)}>
              {days.map((d) => (
                <option key={d} value={d}>
                  {fmtDate(d, s.lang)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('down.from')}>
              <select className="input" value={from} onChange={(e) => setFrom(+e.target.value)}>
                {times.slice(0, -1).map((m) => (
                  <option key={m} value={m}>
                    {hm(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('down.to')}>
              <select className="input" value={to} onChange={(e) => setTo(+e.target.value)}>
                {times
                  .filter((m) => m > from)
                  .map((m) => (
                    <option key={m} value={m}>
                      {hm(m)}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <Field label={t('down.reason')}>
            <input className="input" value={reason} placeholder={t('down.reason_ph')} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </Card>
        <Card className="self-start">
          <h2 className="mb-2 font-head text-xl font-bold">{t('down.affected', { count: affected.length })}</h2>
          {!affected.length && <p className="text-grey-ink">{t('down.none')}</p>}
          <ul className="space-y-1">
            {affected.map((b) => (
              <li key={b.id}>
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-5 accent-orange"
                    checked={!unchecked[b.id]}
                    onChange={(e) => setUnchecked({ ...unchecked, [b.id]: !e.target.checked })}
                  />
                  <span className="font-medium">{findRenter(s.data, b.renter_id).name}</span>
                  <span dir="ltr">
                    {hm(b.start)}–{hm(b.end)}
                  </span>
                  <StatusChip status={b.status} />
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-grey-ink">{t('down.hint')}</p>
          <button className="btn-primary mt-3 w-full" disabled={!reason.trim()} onClick={go}>
            {t('down.go')}
          </button>
        </Card>
      </div>
    </>
  )
}

/** S-07 Book for someone (#26) */
export function BookFor() {
  const { t } = useTranslation()
  const name = useSpaceName()
  const s = useStore()
  const [params] = useSearchParams()
  const [renterId, setRenterId] = useState(params.get('renter') || null)
  const [q, setQ] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('+970')
  const [formKey, setFormKey] = useState(0)
  const r = findRenter(s.data, renterId)
  const ql = q.trim().toLowerCase()
  const results = ql ? s.data.renters.filter((x) => x.name.toLowerCase().includes(ql) || (normPhone(ql) && normPhone(x.phone).includes(normPhone(ql)))) : []
  const upcoming = s.data.bookings
    .filter((b) => ACTIVE.includes(b.status) && b.date >= dateOf(s.now))
    .sort((a, b) => startAbs(a) - startAbs(b))
    .slice(0, 12)
  const submit = (f) => {
    const { ids } = s.createBooking({ ...f, renterId: r.id }, { createdBy: 'staff', source: 'staff' })
    if (ids.length) s.showToast('toast.staff_booked', { name: r.name })
    setFormKey(formKey + 1)
  }
  return (
    <>
      <StaffTitle id="S-07" title={t('bookfor.title')} phase="next" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4 self-start">
          <h2 className="font-head text-xl font-bold">1 · {t('bookfor.who')}</h2>
          {r ? (
            <div className="flex items-center justify-between rounded-lg bg-surface p-3">
              <span>
                <b>{r.name}</b> · <span dir="ltr">{r.phone}</span>
              </span>
              <button className="btn-link" onClick={() => setRenterId(null)}>
                {t('bookfor.change')}
              </button>
            </div>
          ) : (
            <>
              <input className="input" placeholder={t('staff.search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('staff.search')} />
              <ul>
                {results.map((x) => (
                  <li key={x.id}>
                    <button
                      className="flex min-h-11 w-full items-center justify-between rounded px-2 text-start hover:bg-black/[0.03]"
                      onClick={() => setRenterId(x.id)}
                    >
                      <span>{x.name}</span>
                      <span dir="ltr" className="text-sm text-grey-ink">
                        {x.phone}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-semibold">{t('bookfor.or_create')}</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder={t('auth.name')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  aria-label={t('auth.name')}
                />
                <input
                  className="input"
                  dir="ltr"
                  placeholder="+970…"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  aria-label={t('auth.phone')}
                />
              </div>
              <button
                className="btn-secondary"
                disabled={newName.trim().length < 2 || normPhone(newPhone).length < 10}
                onClick={() => {
                  const existing = s.findByPhoneOrEmail(newPhone)
                  setRenterId(existing ? existing.id : s.createRenter({ name: newName.trim(), phone: newPhone.replace(/\s/g, '') }))
                }}
              >
                {t('bookfor.create')}
              </button>
            </>
          )}
        </Card>
        <Card className="self-start">
          <h2 className="mb-3 font-head text-xl font-bold">2 · {t('bookfor.what')}</h2>
          {r ? (
            <BookingForm key={formKey} onSubmit={submit} submitLabel={t('bookfor.book', { name: r.name.split(' ')[0] })} />
          ) : (
            <p className="text-grey-ink">{t('bookfor.pick_first')}</p>
          )}
        </Card>
      </div>
      <Card className="mt-5">
        <h2 className="mb-2 font-head text-xl font-bold">{t('bookfor.upcoming')}</h2>
        <table className="w-full">
          <tbody>
            {upcoming.map((b) => (
              <tr key={b.id} className="border-b border-black/[0.06]">
                <td className="py-2 font-medium">{findRenter(s.data, b.renter_id).name}</td>
                <td>{name(b.space_id)}</td>
                <td>
                  {fmtDate(b.date, s.lang)} ·{' '}
                  <span dir="ltr">
                    {hm(b.start)}–{hm(b.end)}
                  </span>
                </td>
                <td>{t(`created_by.${b.created_by}`)}</td>
                <td>
                  <StatusChip status={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
