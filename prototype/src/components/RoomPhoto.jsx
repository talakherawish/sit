import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useL } from '../lib/hooks'

/**
 * Illustrated room "photos" until real Technopark photos are in: each one is drawn from the room itself
 * (its seats, screen, whiteboard and window), tinted with the room's colours. Three views per room:
 * 0 = the room from the door, 1 = the room from above, 2 = a close-up of what it's good for.
 */
export function RoomPhoto({ space, i = 0, label, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const accent = space.photos[i % space.photos.length]
  const has = (f) => space.features.includes(f)
  const big = space.kind === 'big_room'
  const view = i % 3
  return (
    <svg viewBox="0 0 200 120" className={`block w-full rounded-2xl ${className}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fd0ec" />
          <stop offset="1" stopColor="#e3f2fa" />
        </linearGradient>
        <linearGradient id={`wall${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6f2ea" />
          <stop offset="1" stopColor="#ebe4d8" />
        </linearGradient>
      </defs>
      {view === 0 && <FrontView accent={accent} has={has} big={big} seats={space.capacity} uid={uid} />}
      {view === 1 && <TopView accent={accent} has={has} big={big} seats={space.capacity} />}
      {view === 2 && <CloseUp accent={accent} has={has} uid={uid} />}
    </svg>
  )
}

function Plant({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="-22" rx="9" ry="12" fill="#4f8a6a" />
      <ellipse cx="-7" cy="-14" rx="7" ry="9" fill="#5f9c78" />
      <ellipse cx="7" cy="-15" rx="7" ry="9" fill="#3f7a5b" />
      <path d="M-7 -6 h14 l-2 12 h-10 Z" fill="#c98f5f" />
    </g>
  )
}

function FrontView({ accent, has, big, seats, uid }) {
  const tableW = big ? 128 : 70
  const tx = 100 - tableW / 2
  const back = Math.ceil(seats / 2)
  const front = Math.floor(seats / 2)
  const row = (n, w) => Array.from({ length: n }, (_, k) => tx + ((k + 0.5) * tableW) / n - w / 2)
  return (
    <>
      <rect width="200" height="120" fill={`url(#wall${uid})`} />
      <rect width="200" height="82" fill={accent} opacity=".16" />
      {/* floor */}
      <rect y="82" width="200" height="38" fill="#d8c6aa" />
      {[90, 99, 109].map((yy) => (
        <line key={yy} x1="0" y1={yy} x2="200" y2={yy} stroke="#c7b292" strokeWidth=".6" />
      ))}
      <rect y="80" width="200" height="3" fill="#fff" opacity=".7" />
      {/* ceiling lights */}
      {[60, 140].map((cx) => (
        <g key={cx}>
          <rect x={cx - 14} y="0" width="28" height="3" rx="1.5" fill="#fff" />
          <path d={`M${cx - 14} 3 L${cx - 24} 30 L${cx + 24} 30 L${cx + 14} 3 Z`} fill="#fff" opacity=".18" />
        </g>
      ))}
      {has('window') && (
        <g>
          <rect x="10" y="14" width="44" height="46" rx="2" fill={`url(#sky${uid})`} stroke="#fff" strokeWidth="3" />
          <path d="M12 52 Q24 40 34 48 T54 44 V58 H12 Z" fill="#8cbf9a" opacity=".8" />
          <line x1="32" y1="14" x2="32" y2="60" stroke="#fff" strokeWidth="2" />
          <circle cx="45" cy="24" r="4" fill="#ffe7a3" />
        </g>
      )}
      {has('screen') && (
        <g>
          <rect x="74" y="15" width="54" height="32" rx="2" fill="#1f2633" />
          <rect x="78" y="19" width="46" height="24" rx="1" fill={accent} opacity=".85" />
          <rect x="82" y="34" width="5" height="6" fill="#fff" opacity=".8" />
          <rect x="90" y="29" width="5" height="11" fill="#fff" opacity=".8" />
          <rect x="98" y="25" width="5" height="15" fill="#fff" opacity=".8" />
          <rect x="106" y="31" width="14" height="2" fill="#fff" opacity=".6" />
          <rect x="99" y="47" width="4" height="5" fill="#1f2633" />
        </g>
      )}
      {has('whiteboard') && (
        <g>
          <rect x={has('screen') ? 138 : 78} y="16" width="50" height="34" rx="1.5" fill="#fff" stroke="#c9ccd2" />
          <g transform={`translate(${has('screen') ? 138 : 78} 16)`} fill="none" strokeLinecap="round">
            <path d="M7 10 h18 M7 16 h26 M7 22 h14" stroke="#24508F" strokeWidth="1.4" />
            <circle cx="38" cy="14" r="6" stroke="#588888" strokeWidth="1.4" />
            <path d="M28 26 l8 -4" stroke="#c23b3b" strokeWidth="1.2" />
          </g>
          <rect x={has('screen') ? 140 : 80} y="50" width="46" height="2" rx="1" fill="#b9bcc4" />
        </g>
      )}
      {!has('screen') && !has('whiteboard') && (
        <g>
          <rect x="84" y="20" width="34" height="26" fill="#fff" stroke="#d8d2c6" strokeWidth="2" />
          <path d="M88 42 L98 30 L105 37 L110 32 L115 42 Z" fill={accent} opacity=".7" />
        </g>
      )}
      {/* socket */}
      {has('socket') && <rect x="166" y="70" width="7" height="5" rx="1" fill="#fff" stroke="#c9ccd2" strokeWidth=".6" />}
      {has('ac') && (
        <g>
          <rect x="150" y="4" width="40" height="10" rx="3" fill="#fff" stroke="#d6d6d6" strokeWidth=".6" />
          <line x1="154" y1="11" x2="186" y2="11" stroke="#cfd3d8" />
        </g>
      )}
      {/* chairs behind the table */}
      {row(back, 14).map((x, k) => (
        <rect key={k} x={x} y="62" width="14" height="18" rx="4" fill="#3b4656" />
      ))}
      {/* table */}
      <rect x={tx} y="76" width={tableW} height="6" rx="2" fill="#a0784f" />
      <rect x={tx + 6} y="82" width="3" height="20" fill="#7c5c3c" />
      <rect x={tx + tableW - 9} y="82" width="3" height="20" fill="#7c5c3c" />
      {/* laptop and cup */}
      <path d={`M${tx + tableW / 2 - 12} 76 l3 -9 h18 l3 9 Z`} fill="#c9ced6" />
      <rect x={tx + tableW / 2 + 18} y="70" width="5" height="6" rx="1" fill="#fff" />
      {/* chairs in front, seen from behind */}
      {row(front, 18).map((x, k) => (
        <rect key={k} x={x} y="86" width="18" height="24" rx="5" fill={accent} />
      ))}
      <Plant x={186} y={104} s={big ? 1 : 0.85} />
    </>
  )
}

function TopView({ accent, has, big, seats }) {
  const tw = big ? 110 : 56
  const th = big ? 34 : 30
  const tx = 100 - tw / 2
  const ty = 62 - th / 2
  // Chairs on the two long sides, any odd one at the end
  const side = Math.floor(seats / 2)
  const chairs = []
  for (let k = 0; k < side; k++) {
    const x = tx + ((k + 0.5) * tw) / side
    chairs.push([x, ty - 9], [x, ty + th + 9])
  }
  if (seats % 2) chairs.push([tx + tw + 10, 62])
  return (
    <>
      <rect width="200" height="120" fill="#e9dfcf" />
      {Array.from({ length: 12 }, (_, k) => (
        <line key={k} x1={k * 18} y1="0" x2={k * 18} y2="120" stroke="#dccfbb" strokeWidth=".8" />
      ))}
      {/* walls */}
      <rect x="2" y="2" width="196" height="116" fill="none" stroke="#5b6472" strokeWidth="4" />
      {has('window') && <rect x="40" y="0" width="60" height="4" fill="#9fd0ec" />}
      {has('screen') && <rect x="194" y="40" width="4" height="44" fill="#1f2633" />}
      {has('whiteboard') && <rect x="2" y="34" width="4" height="56" fill="#fff" stroke="#c9ccd2" strokeWidth=".6" />}
      {/* door */}
      <rect x="150" y="114" width="30" height="4" fill="#e9dfcf" />
      <path d="M150 116 A28 28 0 0 1 178 88" fill="none" stroke="#9aa3ad" strokeDasharray="2 2" />
      {/* rug */}
      <rect x={tx - 16} y={ty - 20} width={tw + 32} height={th + 40} rx="6" fill={accent} opacity=".22" />
      {chairs.map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r="6.5" fill="#3b4656" />
      ))}
      <rect x={tx} y={ty} width={tw} height={th} rx="5" fill="#a0784f" />
      <rect x={tx + 3} y={ty + 3} width={tw - 6} height={th - 6} rx="3" fill="#b38a5f" />
      <rect x={tx + tw / 2 - 8} y={ty + th / 2 - 5} width="16" height="10" rx="1" fill="#c9ced6" />
      <circle cx="18" cy="102" r="9" fill="#4f8a6a" />
      <circle cx="18" cy="102" r="4" fill="#3f7a5b" />
    </>
  )
}

function CloseUp({ accent, has, uid }) {
  if (has('whiteboard'))
    return (
      <>
        <rect width="200" height="120" fill={accent} opacity=".25" />
        <rect x="14" y="10" width="172" height="96" rx="3" fill="#fff" stroke="#c9ccd2" strokeWidth="1.5" />
        <g fill="none" strokeLinecap="round" strokeWidth="2">
          <path d="M30 30 h50 M30 42 h70 M30 54 h40" stroke="#24508F" />
          <path d="M30 76 q20 -18 40 0 t40 0" stroke="#588888" />
          <circle cx="140" cy="42" r="16" stroke="#c23b3b" />
        </g>
        <rect x="120" y="66" width="22" height="22" fill="#ffe08a" transform="rotate(-6 131 77)" />
        <rect x="148" y="64" width="22" height="22" fill="#a7e0c8" transform="rotate(5 159 75)" />
        <rect x="14" y="106" width="172" height="5" rx="2" fill="#b9bcc4" />
        <rect x="40" y="103" width="18" height="4" rx="2" fill="#24508F" />
      </>
    )
  if (has('window'))
    return (
      <>
        <rect width="200" height="120" fill={`url(#wall${uid})`} />
        <rect x="20" y="8" width="160" height="88" rx="3" fill={`url(#sky${uid})`} stroke="#fff" strokeWidth="5" />
        <circle cx="150" cy="30" r="10" fill="#ffe7a3" />
        <path d="M22 80 Q60 50 100 70 T178 62 V94 H22 Z" fill="#8cbf9a" />
        <path d="M22 88 Q70 70 120 84 T178 82 V94 H22 Z" fill="#6aa37f" />
        <line x1="100" y1="8" x2="100" y2="96" stroke="#fff" strokeWidth="4" />
        <rect x="0" y="96" width="200" height="24" fill="#a0784f" />
        <rect x="0" y="96" width="200" height="4" fill="#b38a5f" />
        <rect x="34" y="84" width="10" height="12" rx="2" fill="#fff" />
        <path d="M120 96 l4 -14 h30 l4 14 Z" fill="#c9ced6" />
      </>
    )
  return (
    <>
      <rect width="200" height="120" fill="#2a3240" />
      <rect x="22" y="12" width="156" height="88" rx="4" fill="#1f2633" />
      <rect x="28" y="18" width="144" height="76" rx="2" fill={accent} />
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x={46 + k * 26} y={78 - (k + 1) * 12} width="16" height={(k + 1) * 12} rx="1" fill="#fff" opacity=".85" />
      ))}
      <rect x="40" y="26" width="60" height="5" rx="2" fill="#fff" opacity=".7" />
      <rect x="94" y="100" width="12" height="10" fill="#1f2633" />
      <rect x="0" y="108" width="200" height="12" fill="#a0784f" />
    </>
  )
}

/** Swipeable photos with dots underneath. */
export function PhotoCarousel({ space, className = '' }) {
  const { t } = useTranslation()
  const L = useL()
  const [photo, setPhoto] = useState(0)
  return (
    <div className={className}>
      <div
        className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto"
        dir="ltr"
        onScroll={(e) => setPhoto(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {space.photos.map((_, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            <RoomPhoto space={space} i={i} label={t('details.photo', { n: i + 1, room: L(space.label) })} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
        {space.photos.map((_, i) => (
          <span key={i} className={`size-2 rounded-full ${i === photo ? 'bg-navy' : 'bg-grey/40'}`} />
        ))}
      </div>
    </div>
  )
}
