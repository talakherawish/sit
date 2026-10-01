import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { REASONS, REMINDERS, hoursFor, isFree, reminderAt, dateOf, minOfDay, closedReason } from '../lib/logic'
import { addDays, fmtDate, fmtAbs, hm, ceil30, weekdayName } from '../lib/time'
import { Field, PhaseBadge, Chip } from './ui'

/** The single booking form behind every way to book (R-06, S-07). */
export default function BookingForm({ initial = {}, onSubmit, submitLabel, compact }) {
  const { t } = useTranslation()
  const L = useL()
  const lang = useStore((s) => s.lang)
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)

  const days = useMemo(() => Array.from({ length: 21 }, (_, i) => addDays(dateOf(now), i)), [now])
  const firstOpen = days.find((d) => hoursFor(data, d))
  const [spaceId, setSpaceId] = useState(initial.spaceId || data.spaces[0].id)
  const [date, setDate] = useState(initial.date && hoursFor(data, initial.date) ? initial.date : firstOpen)
  const [start, setStart] = useState(initial.start ?? null)
  const [end, setEnd] = useState(initial.end ?? null)
  const [reason, setReason] = useState(initial.reason || '')
  const [reasonOther, setReasonOther] = useState(initial.reasonOther || '')
  const [reminder, setReminder] = useState(null)
  const [repeat, setRepeat] = useState({ on: false, kind: 'days', days: [], until: addDays(dateOf(now), 28) })

  const h = hoursFor(data, date)
  const earliest = date === dateOf(now) ? ceil30(minOfDay(now)) : 0
  const startOpts = []
  const endOpts = []
  if (h) {
    for (let m = h.open; m < h.close; m += 30) startOpts.push({ m, ok: m >= earliest && isFree(data, spaceId, date, m, m + 30) })
    if (start !== null) for (let m = start + 30; m <= h.close; m += 30) endOpts.push({ m, ok: isFree(data, spaceId, date, start, m) })
  }

  // Keep start/end valid when the room or date changes.
  useEffect(() => {
    const okStarts = startOpts.filter((o) => o.ok).map((o) => o.m)
    let s = start
    if (s === null || !okStarts.includes(s)) s = okStarts[0] ?? null
    let e = end
    if (s === null) e = null
    else if (e === null || e <= s || !isFree(data, spaceId, date, s, e)) e = isFree(data, spaceId, date, s, s + 60) ? s + 60 : s + 30
    if (s !== start) setStart(s)
    if (e !== end) setEnd(e)
  }, [spaceId, date, start, end, now]) // eslint-disable-line react-hooks/exhaustive-deps

  const remOpts = start === null ? [] : REMINDERS.map((k) => ({ k, at: reminderAt(date, start, k) })).filter((o) => o.at > now)
  useEffect(() => {
    if (!remOpts.some((o) => o.k === reminder)) setReminder(remOpts[0]?.k ?? null)
  }, [date, start, now]) // eslint-disable-line react-hooks/exhaustive-deps

  const valid = start !== null && end > start && isFree(data, spaceId, date, start, end) && reason && (reason !== 'other' || reasonOther.trim())

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    onSubmit({ spaceId, date, start, end, reason, reasonOther: reasonOther.trim(), reminder, repeat: repeat.on ? repeat : null })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('book.room')}>
        <select className="input" value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
          {data.spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {L(s.label)} · {t('map.people', { n: s.capacity })}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('book.date')}>
        <select className="input" value={date} onChange={(e) => setDate(e.target.value)}>
          {days.map((d) => {
            const closed = !hoursFor(data, d)
            const why = closedReason(data, d)
            return (
              <option key={d} value={d} disabled={closed}>
                {fmtDate(d, lang)}
                {closed ? ` — ${t('common.closed')}${why ? ` (${L(why)})` : ''}` : ''}
              </option>
            )
          })}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('book.start')}>
          <select className="input" value={start ?? ''} onChange={(e) => setStart(+e.target.value)}>
            {startOpts.map((o) => (
              <option key={o.m} value={o.m} disabled={!o.ok}>
                {hm(o.m)}
                {!o.ok ? ` · ${t('book.taken')}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('book.end')}>
          <select className="input" value={end ?? ''} onChange={(e) => setEnd(+e.target.value)}>
            {endOpts.map((o) => (
              <option key={o.m} value={o.m} disabled={!o.ok}>
                {hm(o.m)}
                {!o.ok ? ` · ${t('book.taken')}` : ''}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={`${t('book.reason')} *`} error={!reason ? t('book.reason_required') : null}>
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value)} required>
          <option value="">{t('book.choose')}</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`reason.${r}`)}
            </option>
          ))}
        </select>
      </Field>
      {reason === 'other' && (
        <Field label={t('book.reason_other')}>
          <input className="input" value={reasonOther} maxLength={80} onChange={(e) => setReasonOther(e.target.value)} />
        </Field>
      )}
      <fieldset>
        <legend className="mb-1 text-sm font-medium">{t('book.reminder')}</legend>
        {remOpts.length ? (
          <div className="flex flex-wrap gap-2">
            {remOpts.map((o) => (
              <Chip key={o.k} active={reminder === o.k} onClick={() => setReminder(o.k)} label={`${t(`reminder.${o.k}`)} (${fmtAbs(o.at, lang)})`}>
                {t(`reminder.${o.k}`)}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-surface p-3 text-sm">{t('book.no_reminder')}</p>
        )}
        <p className="mt-1 text-xs text-grey-ink">{t('book.reminder_hint')}</p>
      </fieldset>

      {!compact && (
        <fieldset className="rounded-lg bg-white p-3 ring-1 ring-grey/20">
          <label className="flex min-h-11 items-center justify-between gap-2">
            <span className="font-medium">
              {t('book.repeat')} <PhaseBadge phase="next" />
            </span>
            <input type="checkbox" className="size-6 accent-orange" checked={repeat.on} onChange={(e) => setRepeat({ ...repeat, on: e.target.checked })} />
          </label>
          {repeat.on && (
            <div className="mt-2 space-y-3">
              <div className="flex gap-2">
                <Chip active={repeat.kind === 'days'} onClick={() => setRepeat({ ...repeat, kind: 'days' })}>
                  {t('book.repeat_days')}
                </Chip>
                <Chip active={repeat.kind === 'weekly'} onClick={() => setRepeat({ ...repeat, kind: 'weekly' })}>
                  {t('book.repeat_weekly')}
                </Chip>
              </div>
              {repeat.kind === 'days' && (
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1, 2, 3, 4, 6].map((wd) => (
                    <Chip
                      key={wd}
                      active={repeat.days.includes(wd)}
                      onClick={() => setRepeat({ ...repeat, days: repeat.days.includes(wd) ? repeat.days.filter((x) => x !== wd) : [...repeat.days, wd] })}
                    >
                      {weekdayName(wd, lang).slice(0, lang === 'ar' ? 8 : 3)}
                    </Chip>
                  ))}
                </div>
              )}
              <Field label={t('book.until')}>
                <input type="date" className="input" value={repeat.until} min={date} onChange={(e) => setRepeat({ ...repeat, until: e.target.value })} />
              </Field>
            </div>
          )}
        </fieldset>
      )}

      <button type="submit" className="btn-primary w-full" disabled={!valid}>
        {submitLabel || t('book.book')}
      </button>
    </form>
  )
}
