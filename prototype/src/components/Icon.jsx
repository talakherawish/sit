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
  cup: 'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8Zm11 2h1.5a2.5 2.5 0 0 1 0 5H16M8 2v3m3-3v3',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
  wifi: 'M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 19.5h.01',
  printer: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
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

const brand = (file) => `${import.meta.env.BASE_URL}brand/${file}`

/** Technopark Palestine logo: emblem + wordmark for bars, or the full stacked logo. */
export function TechnoparkLogo({ full, className = '' }) {
  if (full) return <img src={brand('technopark-logo.jpg')} alt="Technopark Palestine" className={`h-36 w-auto ${className}`} />
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} role="img" aria-label="Technopark Palestine" dir="ltr">
      <img src={brand('technopark-mark.png')} alt="" className="h-9 w-auto rounded-[4px]" />
      <span className="leading-none">
        <span className="block text-[17px] font-bold tracking-[0.02em] text-navy">TECHNO PARK</span>
        <span className="mt-1 block text-[12px] font-medium tracking-[0.3em] text-teal">PALESTINE</span>
      </span>
    </span>
  )
}
