import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL } from '../lib/hooks'
import { stateAt, nextFreeAt } from '../lib/logic'
import { hm } from '../lib/time'
import Icon from './Icon'

const TEAL = '#588888',
  GREY = '#6B7B7A',
  ORANGE = '#F5821F',
  RED = '#D64545',
  INK = '#111111'

/** Top-down plan of the Technopark ground floor. Rooms are tappable; public seating shows the staff count. */
export default function FloorPlan({ date, min, mode, selected, onSelect, hint }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const hl = data.work_modes.find((m) => m.id === mode)?.highlight_zone_types || []
  const zoneType = (zid) => data.zones.find((z) => z.id === zid).type
  const { taken, total } = data.seats
  const pub = data.zones.find((z) => z.type === 'public_seating')
  const pubMatch = hl.includes('public_seating')
  const dimPub = mode !== 'browse' && !pubMatch && selected !== 'public'

  const key = (fn) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }

  return (
    <TransformWrapper minScale={1} maxScale={3} doubleClick={{ mode: 'zoomIn', step: 0.7 }} wheel={{ step: 0.12 }} panning={{ velocityDisabled: true }}>
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div>
          <div className="overflow-hidden rounded-lg bg-white ring-1 ring-grey/20">
            <TransformComponent wrapperStyle={{ width: '100%' }} contentStyle={{ width: '100%' }}>
              <svg viewBox="0 0 360 320" className="block w-full select-none" style={{ direction: 'ltr' }} role="group" aria-label={t('map.aria')}>
                <defs>
                  <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="8" height="8" fill="#fff" />
                    <rect width="4" height="8" fill={RED} opacity=".35" />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="360" height="320" fill="#F4F7F7" />

                {/* Public seating zone: not bookable, shaded by how full it is */}
                <g
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer outline-none"
                  aria-label={t('map.public_aria', { taken, total })}
                  onClick={() => onSelect('public')}
                  onKeyDown={key(() => onSelect('public'))}
                  opacity={dimPub ? 0.35 : 1}
                >
                  <rect
                    x={pub.map_shape.x}
                    y={pub.map_shape.y}
                    width={pub.map_shape.w}
                    height={pub.map_shape.h}
                    rx="8"
                    fill={ORANGE}
                    fillOpacity={0.06 + 0.22 * (taken / total)}
                    stroke={selected === 'public' || pubMatch ? ORANGE : TEAL}
                    strokeWidth={selected === 'public' || pubMatch ? 3 : 1.5}
                    strokeDasharray={selected === 'public' || pubMatch ? '' : '5 3'}
                  />
                  <text x="114" y="104" textAnchor="middle" fontSize="13" fontWeight="600" fill={INK}>
                    {L(pub.name)}
                  </text>
                  {Array.from({ length: total }, (_, i) => (
                    <circle
                      key={i}
                      cx={24 + (i % 10) * 20.2}
                      cy={122 + Math.floor(i / 10) * 18}
                      r="6"
                      fill={i < taken ? GREY : '#fff'}
                      stroke={i < taken ? GREY : TEAL}
                      strokeWidth="1.5"
                    />
                  ))}
                  <text
                    x="114"
                    y="208"
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="700"
                    fill={INK}
                    style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}
                  >
                    {taken} / {total}
                  </text>
                </g>

                {data.spaces.map((sp) => {
                  const st = stateAt(data, sp.id, date, min)
                  const match = hl.includes(zoneType(sp.zone_id))
                  const isSel = selected === sp.id
                  const dim = mode !== 'browse' && !match && !isSel
                  const fill = st.state === 'down' ? 'url(#hatch)' : st.state === 'booked' ? '#D5DCDC' : '#DCE8E8'
                  const stroke = isSel || match ? ORANGE : st.state === 'down' ? RED : st.state === 'booked' ? GREY : TEAL
                  const cx = sp.map_x + sp.map_w / 2
                  const free = nextFreeAt(data, sp.id, date, min)
                  const until = st.state === 'free' ? null : free
                  const label =
                    st.state === 'free'
                      ? t('map.room_free_aria', { name: L(sp.label), cap: sp.capacity })
                      : st.state === 'booked'
                        ? t('map.room_booked_aria', { name: L(sp.label), until: until !== null ? hm(until) : '—' })
                        : t('map.room_down_aria', { name: L(sp.label) })
                  return (
                    <g
                      key={sp.id}
                      role="button"
                      tabIndex={0}
                      aria-label={label}
                      className="cursor-pointer outline-none"
                      onClick={() => onSelect(sp.id)}
                      onKeyDown={key(() => onSelect(sp.id))}
                      opacity={dim ? 0.35 : 1}
                    >
                      <rect
                        x={sp.map_x}
                        y={sp.map_y}
                        width={sp.map_w}
                        height={sp.map_h}
                        rx="8"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSel || match ? 3 : 1.5}
                      />
                      {/* door gap */}
                      <line x1={cx - 10} x2={cx + 10} y1={sp.map_y + sp.map_h} y2={sp.map_y + sp.map_h} stroke="#F4F7F7" strokeWidth="3" />
                      <text x={cx} y={sp.map_y + sp.map_h / 2 - 4} textAnchor="middle" fontSize="13" fontWeight="600" fill={INK}>
                        {L(sp.short)}
                      </text>
                      <text x={cx} y={sp.map_y + sp.map_h / 2 + 11} textAnchor="middle" fontSize="12" fill={INK}>
                        {t('map.people', { n: sp.capacity })}
                      </text>
                      <text
                        x={cx}
                        y={sp.map_y + sp.map_h / 2 + 26}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="600"
                        fill={st.state === 'down' ? '#a32f2f' : INK}
                      >
                        {st.state === 'free'
                          ? t('map.free')
                          : st.state === 'down'
                            ? t('map.down')
                            : until !== null
                              ? t('map.until', { time: hm(until) })
                              : t('map.booked')}
                      </text>
                      {st.state === 'booked' && <Lock x={sp.map_x + sp.map_w - 10} y={sp.map_y + 10} />}
                    </g>
                  )
                })}

                {data.landmarks.map((lm) => (
                  <g key={lm.id} aria-hidden="true">
                    <rect x={lm.x} y={lm.y} width={lm.w} height={lm.h} rx="8" fill="#E6EBEB" stroke="#C9D2D2" />
                    <text x={lm.x + lm.w / 2} y={lm.y + lm.h / 2 + 4} textAnchor="middle" fontSize="12" fill="#4b5859">
                      {lm.id === 'entrance' ? '↓ ' : ''}
                      {L(lm.label)}
                    </text>
                  </g>
                ))}
              </svg>
            </TransformComponent>
          </div>
          <div className="mt-1 flex items-center gap-1">
            <p className="flex-1 text-xs text-grey-ink">{hint}</p>
            {[
              ['minus', () => zoomOut(0.5)],
              ['plus', () => zoomIn(0.5)],
            ].map(([ic, fn]) => (
              <button key={ic} onClick={fn} className="grid size-11 place-items-center rounded-lg text-navy hover:bg-navy/5" aria-label={t(`map.zoom_${ic}`)}>
                <Icon name={ic} size={18} />
              </button>
            ))}
            <button onClick={() => resetTransform()} className="min-h-11 rounded-lg px-2 text-sm font-semibold text-navy hover:bg-navy/5">
              {t('map.reset')}
            </button>
          </div>
        </div>
      )}
    </TransformWrapper>
  )
}

/** Small padlock badge for booked rooms, so "booked" never relies on colour alone. */
function Lock({ x, y }) {
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r="6.5" fill={INK} />
      <path d={`M${x - 2.5} ${y - 0.5}h5v3.5h-5z M${x - 1.6} ${y - 0.5}v-1.4a1.6 1.6 0 0 1 3.2 0v1.4`} stroke="#fff" strokeWidth="1" fill="none" />
    </g>
  )
}
