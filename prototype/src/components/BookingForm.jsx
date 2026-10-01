import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { REASONS, REMINDERS, hoursFor, isFree, reminderAt, dateOf, minOfDay, closedReason } from '../lib/logic'
import { addDays, fmtDate, fmtAbs, hm, ceil30, weekdayName } from '../lib/time'
import { Chip, Group, GroupRow, PhaseBadge, RowSelect, SectionLabel, Segmented, Switch } from './ui'

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
    <form onSubmit={submit} className="space-y-6">
      <Group label={t('book.when_where')}>
        <GroupRow label={t('book.room')} htmlFor="bf-room">
          <RowSelect id="bf-room" value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
            {data.spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {L(s.label)} · {t('map.people', { n: s.capacity })}
              </option>
            ))}
          </RowSelect>
        </GroupRow>
        <GroupRow label={t('book.date')} htmlFor="bf-date">
          <RowSelect id="bf-date" value={date} onChange={(e) => setDate(e.target.value)}>
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
          </RowSelect>
        </GroupRow>
        <GroupRow label={t('book.start')} htmlFor="bf-start">
          <RowSelect id="bf-start" value={start ?? ''} onChange={(e) => setStart(+e.target.value)}>
            {startOpts.map((o) => (
              <option key={o.m} value={o.m} disabled={!o.ok}>
                {hm(o.m)}
                {!o.ok ? ` · ${t('book.taken')}` : ''}
              </option>
            ))}
          </RowSelect>
        </GroupRow>
        <GroupRow label={t('book.end')} htmlFor="bf-end">
          <RowSelect id="bf-end" value={end ?? ''} onChange={(e) => setEnd(+e.target.value)}>
            {endOpts.map((o) => (
              <option key={o.m} value={o.m} disabled={!o.ok}>
                {hm(o.m)}
                {!o.ok ? ` · ${t('book.taken')}` : ''}
              </option>
            ))}
          </RowSelect>
        </GroupRow>
      </Group>

      <Group label={t('book.reason')} footer={!reason ? t('book.reason_required') : null}>
        <GroupRow label={t('book.purpose')} htmlFor="bf-reason">
          <RowSelect id="bf-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">{t('book.choose')}</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {t(`reason.${r}`)}
              </option>
            ))}
          </RowSelect>
        </GroupRow>
        {reason === 'other' && (
          <div className="px-4 py-1">
            <input
              aria-label={t('book.reason_other')}
              placeholder={t('book.reason_other')}
              className="min-h-11 w-full bg-transparent text-[17px] outline-none placeholder:text-grey-ink/70"
              value={reasonOther}
              maxLength={80}
              onChange={(e) => setReasonOther(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </Group>

      <section>
        <SectionLabel>{t('book.reminder')}</SectionLabel>
        {remOpts.length ? (
          <div className="flex flex-wrap gap-2">
            {remOpts.map((o) => (
              <Chip key={o.k} active={reminder === o.k} onClick={() => setReminder(o.k)} label={`${t(`reminder.${o.k}`)} (${fmtAbs(o.at, lang)})`}>
                {t(`reminder.${o.k}`)}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-surface px-4 py-3 text-[15px]">{t('book.no_reminder')}</p>
        )}
        <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{t('book.reminder_hint')}</p>
      </section>

      {!compact && (
        <Group>
          <div className="flex min-h-12 items-center gap-3 px-4">
            <span className="flex-1 text-[17px]">
              {t('book.repeat')} <PhaseBadge phase="next" />
            </span>
            <Switch checked={repeat.on} onChange={(v) => setRepeat({ ...repeat, on: v })} label={t('book.repeat')} />
          </div>
          {repeat.on && (
            <div className="space-y-3 px-4 py-3">
              <Segmented
                label={t('book.repeat')}
                value={repeat.kind}
                onChange={(v) => setRepeat({ ...repeat, kind: v })}
                options={[
                  ['days', t('book.repeat_days')],
                  ['weekly', t('book.repeat_weekly')],
                ]}
              />
              {repeat.kind === 'days' && (
                <div className="flex justify-between gap-1">
                  {[0, 1, 2, 3, 4, 6].map((wd) => {
                    const on = repeat.days.includes(wd)
                    return (
                      <button
                        type="button"
                        key={wd}
                        aria-pressed={on}
                        aria-label={weekdayName(wd, lang)}
                        onClick={() => setRepeat({ ...repeat, days: on ? repeat.days.filter((x) => x !== wd) : [...repeat.days, wd] })}
                        className={`grid size-11 place-items-center rounded-full text-[14px] font-semibold ${on ? 'bg-ink text-white' : 'bg-white text-ink'}`}
                      >
                        {weekdayName(wd, lang).slice(0, lang === 'ar' ? 3 : 2)}
                      </button>
                    )
                  })}
                </div>
              )}
              <label className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-[17px]">{t('book.until')}</span>
                <input
                  type="date"
                  className="bg-transparent text-end text-[17px] text-grey-ink outline-none"
                  value={repeat.until}
                  min={date}
                  onChange={(e) => setRepeat({ ...repeat, until: e.target.value })}
                />
              </label>
            </div>
          )}
        </Group>
      )}

      <button type="submit" className="btn-primary w-full" disabled={!valid}>
        {submitLabel || t('book.book')}
      </button>
    </form>
  )
}
