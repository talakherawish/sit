import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import Icon from './Icon'

export function PhaseBadge({ phase }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center rounded-full bg-black/[0.06] px-2 py-px align-middle text-[12px] font-medium tracking-wide text-grey-ink">
      {t(`phase.${phase}`)}
    </span>
  )
}

const CHIP = {
  awaiting_confirmation: 'text-[#7a4f00] before:bg-amber',
  confirmed: 'text-[#2f5656] before:bg-teal',
  checked_in: 'text-[#2f5656] before:bg-teal',
  used: 'text-navy before:bg-navy',
  released: 'text-grey-ink before:bg-grey',
  cancelled: 'text-[#a32f2f] before:bg-red',
  cancelled_by_staff: 'text-[#a32f2f] before:bg-red',
  no_show: 'text-[#a32f2f] before:bg-red',
  upcoming: 'text-[#2f5656] before:bg-teal',
  sent: 'text-grey-ink before:bg-grey',
  seen: 'text-navy before:bg-navy',
  in_progress: 'text-[#7a4f00] before:bg-amber',
  fixed: 'text-[#2f5656] before:bg-teal',
  free: 'text-[#2f5656] before:bg-teal',
  booked: 'text-ink before:bg-grey',
  in_use: 'text-navy before:bg-navy',
  down: 'text-[#a32f2f] before:bg-red',
}
/** Quiet status label: a coloured dot plus text, so state never relies on colour alone. */
export function StatusChip({ status, label }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap before:size-1.5 before:rounded-full before:content-[''] ${CHIP[status] || 'text-grey-ink before:bg-grey'}`}
    >
      {label ?? t(`status.${status}`)}
    </span>
  )
}

/** Spec screen ID (R-06, S-01…) for reviewers. Hidden when "Show screen IDs" is off in P-01. */
export function ScreenId({ id, className = '' }) {
  const show = useStore((s) => s.showIds)
  if (!id || !show) return null
  return <p className={`font-mono text-[12px] text-grey-ink/80 ${className}`}>{id}</p>
}

/** iOS-style large title, with an optional "‹ Back" row above it. */
export function ScreenTitle({ id, title, phase, back, children }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="px-5 pt-2 pb-3">
      {back && (
        <button onClick={() => navigate(-1)} className="-ms-2 mb-0.5 flex min-h-11 items-center gap-0.5 pe-2 text-[17px] text-navy">
          <Icon name="back" size={24} className="rtl:rotate-180" />
          {t('common.back')}
        </button>
      )}
      <div className="flex items-end gap-3">
        <h1 className="min-w-0 flex-1 font-head text-[32px] leading-[1.1] font-bold tracking-tight text-ink">
          {title} {phase && <PhaseBadge phase={phase} />}
        </h1>
        {children}
      </div>
      <ScreenId id={id} className="mt-1" />
    </div>
  )
}

/** Small uppercase label above a grouped section (iOS footnote style). */
export function SectionLabel({ children, className = '' }) {
  return <h2 className={`px-1 pb-1.5 text-[15px] font-semibold text-ink ${className}`}>{children}</h2>
}

/** Bottom sheet with a grabber, rounded top and a round close button. */
export function Sheet({ open, onClose, title, children, label }) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={label || title}>
      <button className="animate-fade absolute inset-0 bg-black/30" onClick={onClose} aria-label={t('common.close')} />
      <div className="animate-sheet relative max-h-[88%] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-2 pb-8 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-black/15" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-head text-[22px] font-bold tracking-tight">{title}</h2>
          <CloseButton onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  )
}

function CloseButton({ onClick }) {
  const { t } = useTranslation()
  return (
    <button onClick={onClick} className="-me-2 grid size-11 shrink-0 place-items-center" aria-label={t('common.close')}>
      <span className="grid size-[30px] place-items-center rounded-full bg-black/[0.06] text-grey-ink">
        <Icon name="close" size={16} />
      </span>
    </button>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button className="animate-fade absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-label={t('common.close')} />
      <div className={`animate-pop relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-head text-2xl font-bold tracking-tight">{title}</h2>
          <CloseButton onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  )
}

/** iOS alert: centred title and message, full-width stacked actions. */
export function Confirm({ open, title, body, okLabel, onOk, onCancel, danger, children, fixed }) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className={`${fixed ? 'fixed' : 'absolute'} inset-0 z-50 grid place-items-center p-8`} role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade absolute inset-0 bg-black/30" />
      <div className="animate-pop relative w-full max-w-[300px] overflow-hidden rounded-[18px] bg-white/95 text-center shadow-2xl backdrop-blur-xl">
        <div className="px-5 pt-5 pb-4">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          {body && <p className="mt-1 text-[15px] text-grey-ink">{body}</p>}
          {children && <div className="text-start">{children}</div>}
        </div>
        <div className="grid grid-cols-2 border-t border-black/10">
          <button className="min-h-12 border-e border-black/10 text-[17px] text-navy" onClick={onCancel}>
            {t('common.back')}
          </button>
          <button className={`min-h-12 text-[17px] font-semibold ${danger ? 'text-[#c23b3b]' : 'text-navy'}`} onClick={onOk}>
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** HUD-style toast: dark frosted capsule near the top. */
export function Toast({ fixed }) {
  const toast = useStore((s) => s.toast)
  const set = useStore((s) => s.set)
  const { t } = useTranslation()
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => set({ toast: null }), 3200)
    return () => clearTimeout(id)
  }, [toast, set])
  if (!toast) return null
  return (
    <div className={`${fixed ? 'fixed top-20' : 'absolute top-24'} pointer-events-none inset-x-0 z-50 flex justify-center px-6`} role="status">
      <div
        key={toast.id}
        className="animate-drop flex items-center gap-2 rounded-full bg-[#1c1c1e]/90 px-5 py-3 text-[15px] text-white shadow-xl backdrop-blur-xl"
      >
        <Icon name="check" size={18} className="text-[#7fd1c3]" />
        {t(toast.key, toast.params)}
      </div>
    </div>
  )
}

export function Field({ label, children, hint, error }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[15px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block px-1 text-xs text-grey-ink">{hint}</span>}
      {error && <span className="mt-1 block px-1 text-sm text-[#a32f2f]">{error}</span>}
    </label>
  )
}

/** Inset grouped list (iOS Settings style). Children are <GroupRow>s. */
export function Group({ label, footer, children, className = '' }) {
  return (
    <section className={className}>
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-surface">{children}</div>
      {footer && <p className="mt-1.5 px-1 text-[13px] text-grey-ink">{footer}</p>}
    </section>
  )
}

/** One row of a Group: label on the start side, value / control on the end side. */
export function GroupRow({ label, children, htmlFor }) {
  return (
    <div className="flex min-h-12 items-center gap-3 px-4">
      <label htmlFor={htmlFor} className="shrink-0 text-[17px] text-ink">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </div>
  )
}

/** Native select styled as a quiet trailing value with a chevron. */
export function RowSelect({ id, value, onChange, children, label }) {
  return (
    <span className="relative flex max-w-full items-center">
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={onChange}
        className="min-h-12 max-w-full cursor-pointer appearance-none truncate bg-transparent pe-5 text-end text-[17px] text-grey-ink outline-none focus-visible:text-navy"
      >
        {children}
      </select>
      <Icon name="chevrons" size={14} className="pointer-events-none absolute end-0 text-grey-ink/70" />
    </span>
  )
}

/** iOS switch. */
export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="grid min-h-11 shrink-0 place-items-center"
    >
      <span className={`relative h-[31px] w-[51px] rounded-full transition-colors duration-200 ${checked ? 'bg-teal' : 'bg-black/[0.12]'}`}>
        <span
          className={`absolute top-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-[inset-inline-start] duration-200 ${
            checked ? 'start-[22px]' : 'start-[2px]'
          }`}
        />
      </span>
    </button>
  )
}

/** iOS segmented control. options: [[value, label, icon?], …] */
export function Segmented({ value, onChange, options, label, className = '' }) {
  return (
    <div className={`flex rounded-[10px] bg-[#EBEBEF] p-[2px] ${className}`} role="tablist" aria-label={label}>
      {options.map(([v, text, icon]) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => value !== v && onChange(v)}
          className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3.5 text-[14px] font-semibold transition ${
            value === v ? 'bg-white text-ink shadow-[0_2px_6px_rgba(0,0,0,0.1)]' : 'text-grey-ink'
          }`}
        >
          {icon && <Icon name={icon} size={16} />}
          {text}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className={`min-h-11 rounded-full px-4 text-[15px] font-medium whitespace-nowrap transition active:scale-[0.97] ${
        active ? 'bg-ink text-white' : 'bg-surface text-ink'
      } disabled:cursor-not-allowed disabled:bg-transparent disabled:text-grey/70 disabled:line-through disabled:shadow-none`}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-2xl bg-surface p-4 ${className}`}>{children}</div>
}

/** Placeholder room "photo" — swap with real Technopark photos. */
export function Photo({ color, label, i = 0, className = '' }) {
  const shapes = [
    <g key="a">
      <rect x="20" y="70" width="160" height="12" rx="2" fill="#fff" opacity=".85" />
      <rect x="40" y="82" width="6" height="30" fill="#fff" opacity=".7" />
      <rect x="154" y="82" width="6" height="30" fill="#fff" opacity=".7" />
      <circle cx="70" cy="60" r="10" fill="#fff" opacity=".6" />
      <circle cx="130" cy="60" r="10" fill="#fff" opacity=".6" />
    </g>,
    <g key="b">
      <rect x="30" y="20" width="140" height="70" rx="4" fill="#fff" opacity=".85" />
      <path d="M45 75 L85 45 L110 65 L130 50 L155 75 Z" fill={color} opacity=".5" />
    </g>,
    <g key="c">
      <rect x="25" y="25" width="60" height="80" rx="3" fill="#fff" opacity=".6" />
      <rect x="115" y="25" width="60" height="80" rx="3" fill="#fff" opacity=".6" />
      <line x1="55" y1="25" x2="55" y2="105" stroke={color} strokeWidth="2" />
      <line x1="145" y1="25" x2="145" y2="105" stroke={color} strokeWidth="2" />
    </g>,
  ]
  return (
    <svg viewBox="0 0 200 120" className={`block w-full rounded-2xl ${className}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`ph-${color.slice(1)}-${i}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".78" />
        </linearGradient>
      </defs>
      <rect width="200" height="120" fill={`url(#ph-${color.slice(1)}-${i})`} />
      {shapes[i % 3]}
    </svg>
  )
}

export function Empty({ children }) {
  return <p className="rounded-2xl bg-surface px-4 py-8 text-center text-grey-ink">{children}</p>
}
