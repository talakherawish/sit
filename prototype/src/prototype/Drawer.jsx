import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useTemplate, useSpaceName } from '../lib/hooks'
import { ACTIVE, hoursFor, startAbs, endAbs, dateOf, renter as findRenter } from '../lib/logic'
import { abs, addDays, fmtAbs, hm, split } from '../lib/time'

// Reviewer-only tooling. Not part of the product, so it stays in English and left-to-right.
const TABS = [
  ['p1', 'P-01 Scenario'],
  ['p2', 'P-02 Time'],
  ['p3', 'P-03 Outbox'],
  ['p4', 'P-04 Analytics'],
]

export default function Drawer() {
  const open = useStore((s) => s.drawerOpen)
  const tab = useStore((s) => s.drawerTab)
  const set = useStore((s) => s.set)
  useEffect(() => {
    if (new URLSearchParams(location.search).has('panel')) set({ drawerOpen: true })
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') set({ drawerOpen: !useStore.getState().drawerOpen })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set])
  return (
    <div dir="ltr" lang="en">
      {open && (
        <aside
          id="proto-drawer"
          className="fixed top-0 right-0 z-[65] flex h-dvh w-[400px] max-w-[92vw] flex-col bg-white shadow-2xl ring-1 ring-ink/10"
          aria-label="Prototype panel"
        >
          <div className="flex items-center justify-between bg-ink px-4 py-3 text-white">
            <p className="font-semibold">
              ⚙ Prototype panel <span className="text-xs text-white/70">(reviewer only)</span>
            </p>
            <button className="grid size-10 place-items-center rounded text-xl" onClick={() => set({ drawerOpen: false })} aria-label="Close panel">
              ×
            </button>
          </div>
          <div className="grid grid-cols-4 border-b border-grey/20 text-xs" role="tablist">
            {TABS.map(([k, l]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => set({ drawerTab: k })}
                className={`min-h-11 px-1 font-semibold ${tab === k ? 'border-b-2 border-navy text-ink' : 'text-grey-ink'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-sm">
            {tab === 'p1' && <Scenario />}
            {tab === 'p2' && <TimeSim />}
            {tab === 'p3' && <Outbox />}
            {tab === 'p4' && <Analytics />}
          </div>
        </aside>
      )}
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex min-h-11 items-start justify-between gap-3 py-1">
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-grey-ink">{hint}</span>}
      </span>
      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-navy" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

const Section = ({ title, children }) => (
  <section className="mb-5">
    <h3 className="mb-2 text-xs font-bold tracking-wider text-grey-ink uppercase">{title}</h3>
    {children}
  </section>
)

function Scenario() {
  const s = useStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const staff = pathname.startsWith('/s')
  const personas = [
    [null, 'Guest', 'Browses without an account'],
    ['tala', 'Tala', 'Remote worker · weekly Tue 09:00 + Mon & Wed course · Focus Room 3 today 13:30'],
    ['leen', 'Leen', 'Student · Arabic · Room 2 today 15:00'],
    ['fatima', 'Fatima', 'Focus Room 2 at 10:00 · Room 1 at 12:00'],
    ['shahd', 'Shahd', 'In Focus Room 3 now · Focus Room 1 at 14:00'],
    ['ahmed', 'Ahmed', 'Freelancer · no bookings yet'],
  ]
  return (
    <>
      <Section title="Surface">
        <div className="grid grid-cols-2 gap-2">
          <button className={`btn-secondary ${!staff ? '!bg-navy !text-white' : ''}`} onClick={() => navigate('/r/home')}>
            Renter app
          </button>
          <button className={`btn-secondary ${staff ? '!bg-navy !text-white' : ''}`} onClick={() => navigate('/s/today')}>
            Staff dashboard
          </button>
        </div>
      </Section>
      <Section title="Log in as (renter)">
        <div className="grid gap-2">
          {personas.map(([id, name, hint]) => (
            <button
              key={name}
              onClick={() => {
                s.loginAs(id)
                if (!staff) navigate('/r/home')
              }}
              className={`flex min-h-11 items-center justify-between rounded-lg px-3 text-left ring-1 ${s.renterId === id ? 'bg-navy/[0.06] ring-2 ring-navy' : 'ring-grey/20'}`}
            >
              <span className="font-semibold">{name}</span>
              <span className="text-xs text-grey-ink">{hint}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Switches">
        <Toggle
          label="This is the reception device"
          hint="#13 — off shows S-00 on the staff dashboard"
          checked={s.receptionDevice}
          onChange={(v) => s.set({ receptionDevice: v })}
        />
        <Toggle label="Next booking attempt hits a just-taken slot" hint="#11 — R-06 → R-07" checked={s.justTaken} onChange={(v) => s.set({ justTaken: v })} />
        <Toggle
          label="Show screen IDs"
          hint="R-01, S-01… under each title — turn off for usability tests"
          checked={s.showIds}
          onChange={(v) => s.set({ showIds: v })}
        />
      </Section>
      <Section title="Data">
        <button
          className="btn-danger w-full"
          onClick={() => {
            s.reset()
            navigate(staff ? '/s/today' : '/r/home')
          }}
        >
          Reset all data
        </button>
      </Section>
      <Section title="Jump to a screen">
        <ScreenIndex />
      </Section>
    </>
  )
}

function ScreenIndex() {
  const navigate = useNavigate()
  const list = [
    ['R-01', '/r/home'],
    ['R-02', '/r/list'],
    ['R-03', '/r/room/big-1'],
    ['R-04', '/r/hours'],
    ['R-06', '/r/book'],
    ['R-07', '/r/taken'],
    ['R-10', '/r/signup'],
    ['R-11', '/r/code'],
    ['R-12', '/r/login'],
    ['R-13', '/r/bookings'],
    ['R-15', '/r/reminder/b-leen'],
    ['R-16', '/r/report'],
    ['R-17', '/r/reports'],
    ['R-18', '/r/notifications'],
    ['S-01', '/s/today'],
    ['S-02', '/s/checkin'],
    ['S-03', '/s/seat-log'],
    ['S-04', '/s/notices'],
    ['S-05', '/s/reports'],
    ['S-06', '/s/people'],
    ['S-07', '/s/book'],
    ['S-10', '/s/settings/rooms'],
  ]
  return (
    <div className="flex flex-wrap gap-1">
      {list.map(([id, to]) => (
        <button key={id} onClick={() => navigate(to)} className="min-h-9 rounded bg-surface px-2 font-mono text-xs hover:bg-navy/10">
          {id}
        </button>
      ))}
      <span className="w-full pt-1 text-xs text-grey-ink">
        R-08, R-09 and R-14 open from their flows; Account from the avatar; S-00 via the reception switch.
      </span>
    </div>
  )
}

function TimeSim() {
  const s = useStore()
  const name = useSpaceName()
  const targets = s.data.bookings.filter((b) => ACTIVE.includes(b.status) && endAbs(b) > s.now).sort((a, b) => startAbs(a) - startAbs(b))
  const preferred = targets.find((b) => b.renter_id === s.renterId && b.status !== 'used') || targets.find((b) => b.id === 'b-leen') || targets[0]
  const [pick, setPick] = useState(null)
  const target = targets.find((b) => b.id === pick) || preferred
  const [last, setLast] = useState(null)
  const date = dateOf(s.now)

  const jump = (to, label) => {
    s.setNow(to)
    setLast(label)
  }
  const nextOpen = () => {
    let d = addDays(date, 1)
    while (!hoursFor(s.data, d)) d = addDays(d, 1)
    return abs(d, hoursFor(s.data, d).open)
  }

  const jumps = target
    ? [
        ['2 h before', startAbs(target) - 120, 'Fires the reminder SMS → R-15'],
        ['1 h before, unconfirmed', startAbs(target) - 60, 'Unconfirmed → auto-released'],
        ['At start time', startAbs(target), 'Change / Cancel → Report a problem'],
        ['15 min after start, no check-in', startAbs(target) + 15, 'Confirmed but not checked in → released'],
      ]
    : []
  const h = hoursFor(s.data, date)

  return (
    <>
      <Section title="Clock">
        <p className="text-2xl font-bold">{fmtAbs(s.now, 'en')}</p>
        {last && <p className="mt-1 rounded bg-teal/10 p-2 text-xs">Last jump: {last}</p>}
      </Section>
      <Section title="Target booking">
        <select className="input" value={target?.id || ''} onChange={(e) => setPick(e.target.value)}>
          {targets.slice(0, 40).map((b) => (
            <option key={b.id} value={b.id}>
              {findRenter(s.data, b.renter_id).name.split(' ')[0]} · {name(b.space_id)} · {split(startAbs(b)).date.slice(5)} {hm(b.start)} · {b.status}
            </option>
          ))}
        </select>
        {target && (
          <p className="mt-1 text-xs text-grey-ink">
            Status now: <b>{target.status}</b>
            {target.reminder_at ? ` · reminder ${fmtAbs(target.reminder_at, 'en')}` : ' · no reminder'}
          </p>
        )}
      </Section>
      <Section title="Jump (forward only)">
        <div className="grid gap-2">
          {jumps.map(([label, to, hint]) => (
            <button
              key={label}
              disabled={to <= s.now}
              onClick={() => jump(to, label)}
              className="btn-secondary !justify-between text-left disabled:!opacity-40"
            >
              <span>{label}</span>
              <span className="text-xs font-normal text-grey-ink">{hint}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Nudge">
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => jump(s.now + 15, '+15 min')}>
            +15 min
          </button>
          <button className="btn-secondary" onClick={() => jump(s.now + 60, '+1 h')}>
            +1 h
          </button>
          {h && (
            <button
              className="btn-secondary"
              onClick={() => jump(abs(date, h.close) + 1, 'Past closing (notices expire)')}
              disabled={abs(date, h.close) < s.now}
            >
              Past closing
            </button>
          )}
          <button className="btn-secondary" onClick={() => jump(nextOpen(), 'Next opening')}>
            Next opening
          </button>
        </div>
      </Section>
    </>
  )
}

function Outbox() {
  const s = useStore()
  const navigate = useNavigate()
  const tpl = useTemplate()
  const msgs = [...s.data.messages].reverse()
  const open = (m) => {
    const b = s.data.bookings.find((x) => x.id === m.booking_id)
    if (m.tpl === 'reminder' && b) {
      s.loginAs(b.renter_id)
      navigate(`/r/reminder/${b.id}`)
    }
  }
  return (
    <>
      <p className="mb-3 text-xs text-grey-ink">Simulated SMS + email service (#6, #7). Nothing leaves the browser. Click a reminder to open R-15.</p>
      {!msgs.length && <p className="rounded bg-surface p-3 text-grey-ink">No messages yet. Sign up, book, or jump the clock.</p>}
      <ul className="space-y-2">
        {msgs.map((m) => (
          <li key={m.id}>
            <button
              onClick={() => open(m)}
              className={`w-full rounded-lg p-3 text-left ring-1 ring-grey/20 ${m.tpl === 'reminder' ? 'hover:bg-navy/5' : 'cursor-default'}`}
            >
              <p className="flex items-center gap-2 text-xs text-grey-ink">
                <span className={`rounded px-1.5 font-bold text-white ${m.channel === 'sms' ? 'bg-teal' : 'bg-navy'}`}>{m.channel.toUpperCase()}</span>
                <span dir="ltr">{m.to}</span>
                <span className="ms-auto">{fmtAbs(m.sent_at, 'en')}</span>
              </p>
              <p className="mt-1">{tpl(m.tpl, m.params)}</p>
              {m.tpl === 'reminder' && <p className="mt-1 text-xs font-semibold text-navy">Open R-15 →</p>}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function Analytics() {
  const s = useStore()
  const date = dateOf(s.now)
  const visitors = new Set(s.data.events.filter((e) => e.name === 'page_view' && dateOf(e.time) === date).map((e) => e.visitor_id)).size
  const counts = s.data.events.reduce((a, e) => ({ ...a, [e.name]: (a[e.name] || 0) + 1 }), {})
  return (
    <>
      <div className="mb-4 rounded-lg bg-navy/[0.06] p-3 ring-1 ring-navy">
        <p className="text-xs text-grey-ink">North Star · unique visitors today (#32)</p>
        <p className="text-4xl font-bold">{visitors}</p>
      </div>
      <Section title="Event counts">
        <div className="flex flex-wrap gap-1">
          {Object.entries(counts).map(([k, v]) => (
            <span key={k} className="rounded bg-surface px-2 py-1 font-mono text-xs">
              {k}: {v}
            </span>
          ))}
        </div>
      </Section>
      <Section title="Event log (newest first)">
        <ul className="divide-y divide-grey/15 font-mono text-xs">
          {[...s.data.events]
            .reverse()
            .slice(0, 150)
            .map((e, i) => (
              <li key={i} className="flex gap-2 py-1.5">
                <span className="text-grey-ink">{hm(split(e.time).min)}</span>
                <span className="font-semibold">{e.name}</span>
                <span className="ms-auto truncate text-grey-ink">
                  {e.visitor_id}
                  {e.source ? ` · ${e.source}` : ''}
                  {e.via ? ` · ${e.via}` : ''}
                  {e.why ? ` · ${e.why}` : ''}
                </span>
              </li>
            ))}
        </ul>
      </Section>
    </>
  )
}
