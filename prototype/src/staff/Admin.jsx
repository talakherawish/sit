import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { isPaused, dateOf } from '../lib/logic'
import { fmtDate, hm, weekdayName } from '../lib/time'
import { Card, PhaseBadge } from '../components/ui'
import { StaffTitle } from './StaffLayout'

function Tile({ label, value, sub, north }) {
  return (
    <div className={`rounded-lg bg-white p-4 ring-1 ${north ? 'ring-2 ring-orange' : 'ring-grey/15'}`}>
      <p className="text-sm text-grey-ink">{label}</p>
      <p className="font-head text-4xl font-bold">{value}</p>
      {sub && <p className="text-xs text-grey-ink">{sub}</p>}
    </div>
  )
}

/** Single-series bar chart with hover tooltips and a table view. */
function Bars({ title, rows, valueKey, color = '#24508F', unit = '' }) {
  const { t } = useTranslation()
  const [table, setTable] = useState(false)
  const [hover, setHover] = useState(null)
  const top = Math.max(...rows.map((r) => r[valueKey]))
  const max = top / 0.9 // headroom so the tallest bar and its label fit
  const W = 520,
    H = 200,
    pad = 28,
    bw = (W - pad) / rows.length
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-head text-xl font-bold">{title}</h3>
        <button className="btn-link !min-h-9 text-sm" onClick={() => setTable(!table)}>
          {table ? t('insights.chart') : t('insights.table')}
        </button>
      </div>
      {table ? (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-grey/10">
                <td className="py-1">{r.label}</td>
                <td className="text-end font-semibold">
                  {r[valueKey]}
                  {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative" dir="ltr">
          <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label={title}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={pad} x2={W} y1={H - f * H * 0.9} y2={H - f * H * 0.9} stroke="#E3E9E9" />
                <text x={pad - 6} y={H - f * H * 0.9 + 4} textAnchor="end" fontSize="12" fill="#56656A">
                  {Math.round(top * f)}
                </text>
              </g>
            ))}
            {rows.map((r, i) => {
              const h = (r[valueKey] / max) * H
              const x = pad + i * bw + bw * 0.2
              const w = bw * 0.6
              return (
                <g key={r.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <rect x={pad + i * bw} y="0" width={bw} height={H} fill="transparent" />
                  <path d={`M${x} ${H} V${H - h + 4} q0 -4 4 -4 h${w - 8} q4 0 4 4 V${H} Z`} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
                  {i === rows.length - 1 && (
                    <text x={x + w / 2} y={H - h - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="#111">
                      {r[valueKey]}
                      {unit}
                    </text>
                  )}
                  <text x={x + w / 2} y={H + 16} textAnchor="middle" fontSize="12" fill="#56656A">
                    {r.label}
                  </text>
                </g>
              )
            })}
          </svg>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-0 rounded-md bg-ink px-2 py-1 text-xs text-white"
              style={{ left: `${((pad + hover * bw) / W) * 100}%` }}
            >
              {rows[hover].label}:{' '}
              <b>
                {rows[hover][valueKey]}
                {unit}
              </b>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

/** S-08 Insights (#30, #32, KPIs) */
export function Insights() {
  const { t } = useTranslation()
  const s = useStore()
  const [table, setTable] = useState(false)
  const [hover, setHover] = useState(null)
  const date = dateOf(s.now)
  const ins = s.data.insights
  const visitorsToday = new Set(s.data.events.filter((e) => e.name === 'page_view' && dateOf(e.time) === date).map((e) => e.visitor_id)).size
  const visitsToday = s.data.visits.filter((v) => dateOf(v.check_in) === date)
  // Last week's mock split (per 100 visits) plus today's real check-ins.
  const sitVisits = ins.weeks.at(-1).sit + visitsToday.filter((v) => v.via === 'sit').length
  const sitShare = Math.round((sitVisits / (100 + visitsToday.length)) * 100)
  const statusDays =
    ins.status_days_this_month +
    new Set(s.data.notices.filter((n) => n.daily && !n.removed && dateOf(n.posted_at).slice(0, 7) === date.slice(0, 7)).map((n) => dateOf(n.posted_at))).size
  const allStars = [...ins.ratings, ...s.data.ratings.map((r) => r.stars)]
  const avg = (allStars.reduce((a, b) => a + b, 0) / allStars.length).toFixed(1)
  const yes = ins.checked_before.yes + s.data.ratings.filter((r) => r.checked_sit_before === 'yes').length
  const no = ins.checked_before.no + s.data.ratings.filter((r) => r.checked_sit_before === 'no').length
  const weeks = ins.weeks

  // Busiest hours: mock pattern (Sun–Thu, Sat) × opening hours
  const days = [0, 1, 2, 3, 4, 6]
  const hours = Array.from({ length: 10 }, (_, i) => 8 + i)
  const busy = (d, h) => Math.round(Math.max(0, 40 * Math.exp(-((h - 12.5) ** 2) / 8) * (d === 6 ? 0.5 : 1) * (1 + ((d * 7 + h) % 5) * 0.06)))
  const maxBusy = Math.max(...days.flatMap((d) => hours.map((h) => busy(d, h))))

  return (
    <>
      <StaffTitle id="S-08" title={t('insights.title')} phase="later" />
      <p className="mb-4 text-sm text-grey-ink">{t('insights.mock')}</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <Tile north label={t('insights.visitors')} value={visitorsToday} sub={t('insights.north_star')} />
        <Tile label={t('insights.via_sit')} value={`${sitShare}%`} sub={t('insights.via_sit_sub', { walk: 100 - sitShare })} />
        <Tile label={t('insights.status_days')} value={statusDays} sub={t('insights.status_days_sub')} />
        <Tile label={t('insights.return')} value={`${ins.return_rate}%`} sub={t('insights.target', { v: '50%' })} />
        <Tile label={t('insights.rating')} value={`${avg} / 5`} sub={t('insights.n_ratings', { count: allStars.length })} />
        <Tile label={t('insights.checked')} value={`${Math.round((yes / (yes + no)) * 100)}%`} sub={t('insights.target', { v: '50%' })} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Bars title={t('insights.bookings_week')} rows={weeks} valueKey="bookings" />
        <Bars title={t('insights.noshows_week')} rows={weeks} valueKey="no_shows" color="#56656A" />
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-head text-xl font-bold">{t('insights.split_week')}</h3>
            <button className="btn-link !min-h-9 text-sm" onClick={() => setTable(!table)}>
              {table ? t('insights.chart') : t('insights.table')}
            </button>
          </div>
          <div className="mb-2 flex gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-navy" />
              {t('insights.sit')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-orange" />
              {t('insights.walk_in')}
            </span>
          </div>
          {table ? (
            <table className="w-full text-sm">
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.label} className="border-b border-grey/10">
                    <td className="py-1">{w.label}</td>
                    <td className="text-end">
                      {w.sit}% / {w.walk_in}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-1" dir="ltr">
              {weeks.map((w) => (
                <div key={w.label} className="flex items-center gap-2 text-xs" title={`${w.label}: ${w.sit}% / ${w.walk_in}%`}>
                  <span className="w-12 text-grey-ink">{w.label}</span>
                  <div className="flex h-5 flex-1 gap-[2px]">
                    <div className="flex items-center rounded-s bg-navy ps-1.5 font-semibold text-white" style={{ width: `${w.sit}%` }}>
                      {w.sit}%
                    </div>
                    <div className="rounded-e bg-orange" style={{ width: `${w.walk_in}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="mb-2 font-head text-xl font-bold">{t('insights.busiest')}</h3>
          <div className="relative overflow-x-auto" dir="ltr">
            <table className="text-xs">
              <thead>
                <tr>
                  <th />
                  {hours.map((h) => (
                    <th key={h} className="px-0.5 font-normal text-grey-ink">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d}>
                    <th className="pe-2 text-start font-normal text-grey-ink">{weekdayName(d, s.lang).slice(0, s.lang === 'ar' ? 8 : 3)}</th>
                    {hours.map((h) => {
                      const v = busy(d, h)
                      return (
                        <td
                          key={h}
                          className="p-[1px]"
                          onMouseEnter={() => setHover(`${weekdayName(d, s.lang)} ${h}:00 — ${v}`)}
                          onMouseLeave={() => setHover(null)}
                        >
                          <div
                            className="h-7 w-9 rounded-sm"
                            style={{ background: '#588888', opacity: 0.08 + 0.92 * (v / maxBusy) }}
                            aria-label={`${h}:00 ${v}`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 h-5 text-sm">{hover || t('insights.hover')}</p>
          </div>
        </Card>
      </div>
    </>
  )
}

function SettingsTabs({ active }) {
  const { t } = useTranslation()
  return (
    <div className="mb-5 flex gap-2">
      <Link to="/s/settings/rooms" className={`btn-secondary ${active === 'rooms' ? '!bg-navy !text-white' : ''}`}>
        {t('settings.rooms_tab')}
      </Link>
      <Link to="/s/settings/no-show" className={`btn-secondary ${active === 'noshow' ? '!bg-navy !text-white' : ''}`}>
        {t('settings.noshow_tab')} <PhaseBadge phase="later" />
      </Link>
    </div>
  )
}

/** S-09 Settings: no-show limit (#31) */
export function NoShowSettings() {
  const { t } = useTranslation()
  const s = useStore()
  const rule = s.data.settings.no_show
  const paused = s.data.renters.filter((r) => isPaused(r, s.now))
  const num = (k) => (
    <input
      type="number"
      min="1"
      max="90"
      className="input mx-1 inline-block !w-20 text-center"
      value={rule[k]}
      aria-label={t(`settings.${k}`)}
      onChange={(e) => s.setNoShowRule({ ...rule, [k]: Math.max(1, +e.target.value || 1) })}
    />
  )
  return (
    <>
      <StaffTitle id="S-09" title={t('settings.title')} phase="later" />
      <SettingsTabs active="noshow" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-head text-xl font-bold">{t('settings.rule')}</h2>
          <p className="leading-[3]">
            {num('count')} {t('settings.noshows_within')} {num('days')} {t('settings.days_pauses')} {num('pause')} {t('settings.days')}
          </p>
        </Card>
        <Card>
          <h2 className="mb-3 font-head text-xl font-bold">{t('settings.paused')}</h2>
          {!paused.length && <p className="text-grey-ink">{t('settings.none_paused')}</p>}
          <ul className="divide-y divide-grey/15">
            {paused.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <span>
                  <b>{r.name}</b> · {t('settings.until', { date: fmtDate(r.paused_until, s.lang) })} · {t('settings.n_noshows', { count: r.no_show_count })}
                </span>
                <button className="btn-secondary" onClick={() => s.setPaused(r.id, false)}>
                  {t('settings.lift')}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}

/** S-10 Settings: rooms and hours (#1, #4) — read-only in the prototype */
export function RoomSettings() {
  const { t } = useTranslation()
  const L = useL()
  const s = useStore()
  return (
    <>
      <StaffTitle id="S-10" title={t('settings.rooms_title')} />
      <SettingsTabs active="rooms" />
      <p className="mb-4 text-sm text-grey-ink">{t('settings.readonly')}</p>
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Card>
          <h2 className="mb-2 font-head text-xl font-bold">{t('settings.spaces')}</h2>
          <table className="w-full text-sm">
            <thead className="text-grey-ink">
              <tr className="border-b border-grey/20">
                {['name', 'zone', 'capacity', 'size', 'amenities', 'photos'].map((c) => (
                  <th key={c} className="py-2 text-start">
                    {t(`settings.col_${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-grey/10">
                <td className="py-2 font-medium">{L(s.data.zones[0].name)}</td>
                <td>{t('settings.public')}</td>
                <td>{s.data.seats.total}</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
              {s.data.spaces.map((sp) => (
                <tr key={sp.id} className="border-b border-grey/10">
                  <td className="py-2 font-medium">{L(sp.label)}</td>
                  <td>{L(s.data.zones.find((z) => z.id === sp.zone_id).name)}</td>
                  <td>{sp.capacity}</td>
                  <td>{sp.size_m2} m²</td>
                  <td>{sp.features.map((f) => t(`feature.${f}`)).join(', ')}</td>
                  <td>
                    <div className="flex gap-1">
                      {sp.photos.map((c, i) => (
                        <span key={i} className="size-5 rounded" style={{ background: c }} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="mt-5 mb-2 font-head text-xl font-bold">{t('settings.zone_rules')}</h2>
          <ul className="space-y-2 text-sm">
            {s.data.zones
              .filter((z) => z.rules.length)
              .map((z) => (
                <li key={z.id}>
                  <b>{L(z.name)}:</b> {z.rules.map((r) => L(r)).join(' · ')}
                </li>
              ))}
          </ul>
        </Card>
        <Card className="self-start">
          <h2 className="mb-2 font-head text-xl font-bold">{t('hours.title')}</h2>
          <table className="w-full text-sm">
            <tbody>
              {s.data.opening_hours.map((o) => (
                <tr key={o.weekday} className="border-b border-grey/10">
                  <td className="py-1.5">{weekdayName(o.weekday, s.lang)}</td>
                  <td className="text-end" dir="ltr">
                    {o.open !== null ? `${hm(o.open)}–${hm(o.close)}` : t('common.closed')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="mt-4 mb-1 font-semibold">{t('hours.closed_days')}</h3>
          <ul className="text-sm">
            {s.data.closed_days.map((c) => (
              <li key={c.date}>
                {fmtDate(c.date, s.lang)} · {L(c.reason)}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
