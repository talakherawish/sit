const P = {
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4m8-4v4',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  bell: 'M6 17V11a6 6 0 1 1 12 0v6l2 2H4l2-2Zm4 3a2 2 0 0 0 4 0',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',
  check: 'M5 12l5 5 9-10',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  home: 'M3 11l9-7 9 7v9H3z',
  door: 'M6 3h12v18H6zM14 12h.01',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  megaphone: 'M3 10v4h4l6 4V6L7 10H3Zm14-2a5 5 0 0 1 0 8',
  inbox: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6l2-8Z',
  seat: 'M7 4v8h10M7 12l-1 8m11-8 1 8M7 16h10',
  chevrons: 'M8 9l4-4 4 4M8 15l4 4 4-4',
}

export default function Icon({ name, className = '', size = 22, filled }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={P[name]} />
    </svg>
  )
}

export function SitMark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="3" width="4" height="11" rx="2" fill="#F5821F" />
        <rect x="5" y="11" width="14" height="4" rx="2" fill="#F5821F" />
        <rect x="7" y="15" width="2.5" height="6" rx="1" fill="#F5821F" />
        <rect x="15" y="15" width="2.5" height="6" rx="1" fill="#F5821F" />
      </svg>
      <span className="font-head text-[26px] leading-none font-bold text-navy">Sit</span>
    </span>
  )
}

/** Stand-in for the Technopark logo; replace with the official brand file. */
export function TechnoparkLogo({ light }) {
  return (
    <div className="flex items-center gap-2" aria-label="Technopark Palestine">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="4" fill="#588888" />
        <path d="M8 10h18M17 10v16" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <div className="leading-tight">
        <div className={`text-[16px] font-bold tracking-wide ${light ? 'text-white' : 'text-navy'}`}>TECHNO PARK</div>
        <div className={`text-[12px] font-light tracking-[0.2em] ${light ? 'text-white/85' : 'text-grey-ink'}`}>PALESTINE</div>
      </div>
    </div>
  )
}
