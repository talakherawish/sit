import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { amenityStatus, stateAt, nextFreeAt } from '../lib/logic'
import { hm } from '../lib/time'
import Icon from './Icon'

// Drawing palette: an architectural plan — dark walls, hairline furniture, quiet tints for room state.
const WALL = '#2C2C2E'
const HAIR = '#AEAEB2'
const FURN = '#C7C7CC'
const TEXT = '#1D1D1F'
const SUB = '#6E6E73'
const TEAL = '#588888'
const ORANGE = '#F5821F'
const ROOM_FILL = { free: '#E4EFEE', booked: '#EDEDF0', down: 'url(#hatch)' }
const SEAT_TAKEN = '#8E8E93'

/** Top-down plan of the Technopark ground floor. Rooms are tappable; public seating shows the staff count. */
export default function FloorPlan({ date, min, mode, selected, onSelect, hint }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const hl = data.work_modes.find((m) => m.id === mode)?.highlight_zone_types || []
  const zoneType = (zid) => data.zones.find((z) => z.id === zid).type
  const { taken, total } = data.seats
  const pub = data.zones.find((z) => z.type === 'public_seating')
  const lm = Object.fromEntries(data.landmarks.map((l) => [l.id, l]))
  const cafe = data.amenities.find((a) => a.id === 'cafeteria')
  const cafeOpen = useStore((s) => amenityStatus(s.data, cafe, s.now).open)
  const pubOn = selected === 'public' || hl.includes('public_seating')
  const dimPub = mode !== 'browse' && !pubOn

  const press = (id) => ({
    role: 'button',
    tabIndex: 0,
    className: 'cursor-pointer outline-none',
    onClick: () => onSelect(id),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(id)
      }
    },
  })

  return (
    <TransformWrapper minScale={1} maxScale={3.5} doubleClick={{ mode: 'zoomIn', step: 0.7 }} wheel={{ step: 0.12 }} panning={{ velocityDisabled: true }}>
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div>
          <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.08]">
            <TransformComponent wrapperStyle={{ width: '100%' }} contentStyle={{ width: '100%' }}>
              <svg viewBox="0 0 360 330" className="block w-full select-none" style={{ direction: 'ltr' }} role="group" aria-label={t('map.aria')}>
                <defs>
                  <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="7" height="7" fill="#FBEDED" />
                    <rect width="2" height="7" fill="#D64545" opacity=".45" />
                  </pattern>
                </defs>
                <rect width="360" height="330" fill="#fff" />

                {/* Open-plan public seating: ten tables, one circle per real seat */}
                <g {...press('public')} aria-label={t('map.public_aria', { taken, total })} opacity={dimPub ? 0.35 : 1}>
                  <rect x={pub.map_shape.x} y={pub.map_shape.y} width={pub.map_shape.w} height={pub.map_shape.h} fill="#FCFBF9" />
                  {pubOn && <rect x={10} y={106} width={204} height={126} rx="10" fill="none" stroke={ORANGE} strokeWidth="2" strokeDasharray="6 4" />}
                  {/* name and count are separate runs so Arabic and digits never reorder into each other */}
                  <text x="16" y="126" fontSize="13" fontWeight="600" fill={TEXT}>
                    {L(pub.name)}
                  </text>
                  <text x="208" y="126" textAnchor="end" fontSize="13" fontWeight="500" fill={SUB} direction="ltr">
                    {taken} / {total}
                  </text>
                  {[160, 208].map((cy, row) =>
                    [26, 68, 110, 152, 194].map((cx, col) => {
                      const table = row * 5 + col
                      return (
                        <g key={`${row}-${col}`}>
                          <rect x={cx - 13} y={cy - 7} width="26" height="14" rx="3" fill="#fff" stroke={FURN} strokeWidth="1.2" />
                          {[
                            [-6, -14],
                            [6, -14],
                            [-6, 14],
                            [6, 14],
                          ].map(([dx, dy], k) => {
                            const isTaken = table * 4 + k < taken
                            return (
                              <circle
                                key={k}
                                cx={cx + dx}
                                cy={cy + dy}
                                r="4.6"
                                fill={isTaken ? SEAT_TAKEN : '#fff'}
                                stroke={isTaken ? SEAT_TAKEN : TEAL}
                                strokeWidth="1.3"
                              />
                            )
                          })}
                        </g>
                      )
                    }),
                  )}
                </g>

                {data.spaces.map((sp) => {
                  const st = stateAt(data, sp.id, date, min)
                  const on = selected === sp.id || hl.includes(zoneType(sp.zone_id))
                  const dim = mode !== 'browse' && !on
                  const until = st.state === 'free' ? null : nextFreeAt(data, sp.id, date, min)
                  const big = sp.kind === 'big_room'
                  const { map_x: x, map_y: y, map_w: w, map_h: h } = sp
                  const cx = x + w / 2
                  const label =
                    st.state === 'free'
                      ? t('map.room_free_aria', { name: L(sp.label), cap: sp.capacity })
                      : st.state === 'booked'
                        ? t('map.room_booked_aria', { name: L(sp.label), until: until !== null ? hm(until) : '—' })
                        : t('map.room_down_aria', { name: L(sp.label) })
                  const status =
                    st.state === 'free'
                      ? t('map.free')
                      : st.state === 'down'
                        ? t('map.down')
                        : until !== null
                          ? t('map.until', { time: hm(until) })
                          : t('map.booked')
                  return (
                    <g key={sp.id} {...press(sp.id)} aria-label={label} opacity={dim ? 0.35 : 1}>
                      <rect x={x} y={y} width={w} height={h} fill={ROOM_FILL[st.state]} />
                      {big ? <MeetingTable x={x} y={y} /> : <Desk x={x} y={y} seats={sp.capacity} />}
                      {on && <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="6" fill="none" stroke={ORANGE} strokeWidth="2.5" />}
                      <rect x={x} y={y} width={w} height={h} fill="none" stroke={WALL} strokeWidth="3" />
                      {big ? <Door x={x} y={y + 70} side="left" /> : <Door x={x + 8} y={y + h} side="bottom" />}
                      <text x={cx} y={y + (big ? 64 : 56)} textAnchor="middle" fontSize="13" fontWeight="600" fill={TEXT}>
                        {L(sp.short)}
                      </text>
                      <text
                        x={cx}
                        y={y + (big ? 80 : 72)}
                        textAnchor="middle"
                        fontSize="12.5"
                        fontWeight="500"
                        fill={st.state === 'down' ? '#B03A3A' : st.state === 'free' ? '#2F5656' : SUB}
                      >
                        {status}
                      </text>
                      {st.state === 'booked' && <Lock x={x + w - 12} y={y + 12} />}
                    </g>
                  )
                })}

                <g {...press('cafeteria')} aria-label={L(lm.cafeteria.label)} opacity={mode !== 'browse' && selected !== 'cafeteria' ? 0.55 : 1}>
                  <Cafeteria {...lm.cafeteria} label={L(lm.cafeteria.label)} open={cafeOpen} />
                  {selected === 'cafeteria' && <SelectRing {...lm.cafeteria} />}
                </g>
                <g {...press('restrooms')} aria-label={L(lm.restrooms.label)} opacity={mode !== 'browse' && selected !== 'restrooms' ? 0.55 : 1}>
                  <Restrooms {...lm.restrooms} label={L(lm.restrooms.label)} />
                  {selected === 'restrooms' && <SelectRing {...lm.restrooms} />}
                </g>
                <Lobby {...lm.reception} label={L(lm.reception.label)} entrance={L(lm.entrance.label)} />

                {/* Façade: thick exterior wall, windows, entrance opening */}
                <rect x="4" y="4" width="352" height="322" fill="none" stroke={WALL} strokeWidth="6" />
                {data.spaces
                  .filter((s) => s.kind === 'focus_room')
                  .map((s) => (
                    <Window key={s.id} x1={s.map_x + 16} x2={s.map_x + 56} y={4} />
                  ))}
                {data.spaces
                  .filter((s) => s.kind === 'big_room')
                  .map((s) => (
                    <Window key={s.id} y1={s.map_y + 22} y2={s.map_y + 82} x={356} vertical />
                  ))}
                <rect x={lm.entrance.x} y={320} width={lm.entrance.w} height={10} fill="#fff" />
                <line x1={lm.entrance.x} x2={lm.entrance.x + lm.entrance.w} y1={326} y2={326} stroke={HAIR} strokeWidth="1" strokeDasharray="3 3" />
              </svg>
            </TransformComponent>
          </div>
          <div className="mt-1 flex items-center gap-1">
            <p className="flex-1 px-1 text-[13px] text-grey-ink">{hint}</p>
            {[
              ['minus', () => zoomOut(0.5)],
              ['plus', () => zoomIn(0.5)],
            ].map(([ic, fn]) => (
              <button
                key={ic}
                onClick={fn}
                className="grid size-11 place-items-center rounded-full text-navy active:bg-black/5"
                aria-label={t(`map.zoom_${ic}`)}
              >
                <Icon name={ic} size={18} />
              </button>
            ))}
            <button onClick={() => resetTransform()} className="min-h-11 rounded-full px-2 text-[15px] text-navy active:bg-black/5">
              {t('map.reset')}
            </button>
          </div>
        </div>
      )}
    </TransformWrapper>
  )
}

/** Door opening with a quarter-circle swing, drawn the way architects do. Hinge at (x, y). */
function Door({ x, y, side }) {
  const r = 20
  const gap = { bottom: [x, x + r, y, y], top: [x - r, x, y, y], left: [x, x, y, y + r] }[side]
  const leaf = { bottom: [x, x, y, y - r], top: [x, x, y, y + r], left: [x, x + r, y, y] }[side]
  const arc = {
    bottom: `M${x + r} ${y} A${r} ${r} 0 0 0 ${x} ${y - r}`,
    top: `M${x - r} ${y} A${r} ${r} 0 0 0 ${x} ${y + r}`,
    left: `M${x} ${y + r} A${r} ${r} 0 0 0 ${x + r} ${y}`,
  }[side]
  return (
    <g aria-hidden="true">
      <line x1={gap[0]} x2={gap[1]} y1={gap[2]} y2={gap[3]} stroke="#fff" strokeWidth="4" />
      <line x1={leaf[0]} x2={leaf[1]} y1={leaf[2]} y2={leaf[3]} stroke={WALL} strokeWidth="1.5" />
      <path d={arc} fill="none" stroke={HAIR} strokeWidth="1" />
    </g>
  )
}

function Window({ x1, x2, y1, y2, x, y, vertical }) {
  if (vertical)
    return (
      <g aria-hidden="true">
        <rect x={x - 3} y={y1} width="6" height={y2 - y1} fill="#fff" />
        <line x1={x - 2} x2={x - 2} y1={y1} y2={y2} stroke={WALL} strokeWidth="1" />
        <line x1={x + 2} x2={x + 2} y1={y1} y2={y2} stroke={WALL} strokeWidth="1" />
      </g>
    )
  return (
    <g aria-hidden="true">
      <rect x={x1} y={y - 3} width={x2 - x1} height="6" fill="#fff" />
      <line x1={x1} x2={x2} y1={y - 2} y2={y - 2} stroke={WALL} strokeWidth="1" />
      <line x1={x1} x2={x2} y1={y + 2} y2={y + 2} stroke={WALL} strokeWidth="1" />
    </g>
  )
}

/** Focus room: a desk under the window with one chair per person. */
function Desk({ x, y, seats }) {
  const xs = Array.from({ length: seats }, (_, k) => x + 36 + (k - (seats - 1) / 2) * 12)
  return (
    <g aria-hidden="true">
      <rect x={x + 12} y={y + 12} width="48" height="13" rx="2" fill="#fff" stroke={FURN} strokeWidth="1.2" />
      {xs.map((cx, k) => (
        <rect key={k} x={cx - 4.5} y={y + 29} width="9" height="8" rx="2.5" fill="#fff" stroke={FURN} strokeWidth="1.2" />
      ))}
    </g>
  )
}

/** Big room: meeting table with chairs all round and a wall screen. */
function MeetingTable({ x, y }) {
  const chair = (cx, cy, vertical, k) => (
    <rect
      key={k}
      x={cx - (vertical ? 4 : 5)}
      y={cy - (vertical ? 5 : 4)}
      width={vertical ? 8 : 10}
      height={vertical ? 10 : 8}
      rx="2.5"
      fill="#fff"
      stroke={FURN}
      strokeWidth="1.2"
    />
  )
  return (
    <g aria-hidden="true">
      <rect x={x + 30} y={y + 18} width="60" height="20" rx="4" fill="#fff" stroke={FURN} strokeWidth="1.2" />
      {[42, 60, 78].map((cx, k) => chair(x + cx, y + 11, false, `t${k}`))}
      {[42, 60, 78].map((cx, k) => chair(x + cx, y + 45, false, `b${k}`))}
      {chair(x + 22, y + 28, true, 'l')}
      {chair(x + 98, y + 28, true, 'r')}
      <line x1={x + 112} x2={x + 112} y1={y + 16} y2={y + 40} stroke={WALL} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  )
}

/** Cafeteria: service counter along the wall, three café tables, an open/closed dot by the name. */
function Cafeteria({ x, y, w, h, label, open }) {
  const table = (cx, cy) => (
    <g key={cx}>
      <circle cx={cx} cy={cy} r="6.5" fill="#fff" stroke={FURN} strokeWidth="1.2" />
      <circle cx={cx - 10} cy={cy} r="3.2" fill="#fff" stroke={FURN} strokeWidth="1.1" />
      <circle cx={cx + 10} cy={cy} r="3.2" fill="#fff" stroke={FURN} strokeWidth="1.1" />
    </g>
  )
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#FBF8F3" />
      <rect x={x + 4} y={y + h - 16} width={w - 8} height="12" rx="2" fill="#F2EEE7" stroke={FURN} strokeWidth="1.2" />
      <circle cx={x + 16} cy={y + h - 10} r="2.6" fill="none" stroke={HAIR} strokeWidth="1.1" />
      {table(x + 21, y + 54)}
      {table(x + 51, y + 54)}
      {table(x + 81, y + 54)}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={WALL} strokeWidth="3" />
      <Door x={x + 84} y={y} side="top" />
      <circle cx={x + 12} cy={y + 30} r="3" fill={open ? TEAL : SEAT_TAKEN} />
      <text x={x + 19} y={y + 34} fontSize="12.5" fontWeight="600" fill={TEXT}>
        {label}
      </text>
    </g>
  )
}

function SelectRing({ x, y, w, h }) {
  return <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="6" fill="none" stroke={ORANGE} strokeWidth="2.5" />
}

function Restrooms({ x, y, w, h, label }) {
  const wc = (cx) => (
    <g key={cx}>
      <rect x={cx - 6} y={y + h - 14} width="12" height="7" rx="1.5" fill="#fff" stroke={FURN} strokeWidth="1.2" />
      <ellipse cx={cx} cy={y + h - 22} rx="6" ry="8" fill="#fff" stroke={FURN} strokeWidth="1.2" />
    </g>
  )
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#fff" />
      <line x1={x + w / 2} x2={x + w / 2} y1={y + 52} y2={y + h} stroke={WALL} strokeWidth="2" />
      {wc(x + w / 4)}
      {wc(x + (3 * w) / 4)}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={WALL} strokeWidth="3" />
      <Door x={x + 68} y={y} side="top" />
      <text x={x + w / 2} y={y + 42} textAnchor="middle" fontSize="12.5" fill={SUB}>
        {label}
      </text>
    </g>
  )
}

/** Lobby with a curved reception desk facing the entrance. */
function Lobby({ x, y, w, label, entrance }) {
  return (
    <g aria-hidden="true">
      <path d={`M${x + 22} ${y + 34} Q${x + w / 2} ${y + 62} ${x + w - 22} ${y + 34}`} fill="none" stroke="#D1D1D6" strokeWidth="10" strokeLinecap="round" />
      <circle cx={x + w / 2} cy={y + 30} r="4.5" fill="#fff" stroke={FURN} strokeWidth="1.2" />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" fontSize="12.5" fontWeight="500" fill={SUB}>
        {label}
      </text>
      <text x={x + w / 2} y={y + 84} textAnchor="middle" fontSize="12.5" fill={SUB}>
        {entrance}
      </text>
      <path d={`M${x + w / 2} ${y + 104} v-12 m-5 5 l5 -5 l5 5`} fill="none" stroke={SUB} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

/** Small padlock badge for booked rooms, so "booked" never relies on colour alone. */
function Lock({ x, y }) {
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r="7" fill={TEXT} />
      <path d={`M${x - 2.6} ${y - 0.4}h5.2v3.6h-5.2z M${x - 1.7} ${y - 0.4}v-1.5a1.7 1.7 0 0 1 3.4 0v1.5`} stroke="#fff" strokeWidth="1" fill="none" />
    </g>
  )
}
