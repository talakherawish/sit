import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import Icon from './Icon'

export function PhaseBadge({ phase }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center rounded-full bg-grey/15 px-2 py-0.5 text-xs font-medium text-grey-ink align-middle">
      {t(`phase.${phase}`)}
    </span>
  )
}

const CHIP = {
  awaiting_confirmation: 'bg-amber/20 text-[#7a4f00]',
  confirmed: 'bg-teal/15 text-[#2f5656]',
  checked_in: 'bg-teal/15 text-[#2f5656]',
  used: 'bg-navy/10 text-navy',
  released: 'bg-grey/15 text-grey-ink',
  cancelled: 'bg-red/10 text-[#a32f2f]',
  cancelled_by_staff: 'bg-red/10 text-[#a32f2f]',
  no_show: 'bg-red/10 text-[#a32f2f]',
  upcoming: 'bg-teal/15 text-[#2f5656]',
  sent: 'bg-grey/15 text-grey-ink',
  seen: 'bg-navy/10 text-navy',
  in_progress: 'bg-amber/20 text-[#7a4f00]',
  fixed: 'bg-teal/15 text-[#2f5656]',
  free: 'bg-teal/15 text-[#2f5656]',
  booked: 'bg-grey/20 text-ink',
  in_use: 'bg-navy/10 text-navy',
  down: 'bg-red/10 text-[#a32f2f]',
}
export function StatusChip({ status, label }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${CHIP[status] || 'bg-grey/15'}`}>
      {label ?? t(`status.${status}`)}
    </span>
  )
}

export function ScreenTitle({ id, title, phase, back, children }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-start gap-2 px-4 pt-4 pb-2">
      {back && (
        <button onClick={() => navigate(-1)} className="-ms-2 grid size-11 shrink-0 place-items-center rounded-lg text-navy" aria-label="Back">
          <Icon name="back" className="rtl:rotate-180" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-head text-[22px] leading-tight font-bold text-ink">
          {title} {phase && <PhaseBadge phase={phase} />}
        </h1>
        {id && <p className="text-xs text-grey-ink">{id}</p>}
      </div>
      {children}
    </div>
  )
}

export function Sheet({ open, onClose, title, children, label }) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={label || title}>
      <button className="absolute inset-0 bg-ink/40" onClick={onClose} aria-label={t('common.close')} />
      <div className="relative max-h-[85%] overflow-y-auto rounded-t-2xl bg-white px-4 pt-3 pb-6 shadow-2xl">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-grey/30" />
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 className="font-head text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="-me-2 grid size-11 place-items-center text-grey-ink" aria-label={t('common.close')}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-ink/40" onClick={onClose} aria-label={t('common.close')} />
      <div className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl`}>
        <div className="mb-3 flex items-start justify-between">
          <h2 className="font-head text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="grid size-11 place-items-center text-grey-ink" aria-label={t('common.close')}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Confirm({ open, title, body, okLabel, onOk, onCancel, danger, children, fixed }) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className={`${fixed ? 'fixed' : 'absolute'} inset-0 z-50 grid place-items-center p-6`} role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40" />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
        <h2 className="font-head text-xl font-bold">{title}</h2>
        {body && <p className="mt-1 text-grey-ink">{body}</p>}
        {children}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>{t('common.back')}</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onOk}>{okLabel}</button>
        </div>
      </div>
    </div>
  )
}

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
    <div className={`${fixed ? 'fixed top-20' : 'absolute top-16'} inset-x-0 z-50 flex justify-center px-4 pointer-events-none`} role="status">
      <div className="rounded-lg bg-ink px-4 py-3 text-white shadow-lg">{t(toast.key, toast.params)}</div>
    </div>
  )
}

export function Field({ label, children, hint, error }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-grey-ink">{hint}</span>}
      {error && <span className="mt-1 block text-sm text-[#a32f2f]">{error}</span>}
    </label>
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
      className={`min-h-11 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition ${
        active ? 'border-orange bg-orange/10 text-ink ring-2 ring-orange' : 'border-grey/30 bg-white text-ink'
      } disabled:cursor-not-allowed disabled:border-grey/20 disabled:bg-surface disabled:text-grey/70 disabled:line-through`}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-lg bg-white p-4 shadow-sm ring-1 ring-grey/15 ${className}`}>{children}</div>
}

/** Placeholder room "photo" — swap with real Technopark photos. */
export function Photo({ color, label, i = 0, className = '' }) {
  const shapes = [
    <g key="a"><rect x="20" y="70" width="160" height="12" rx="2" fill="#fff" opacity=".85" /><rect x="40" y="82" width="6" height="30" fill="#fff" opacity=".7" /><rect x="154" y="82" width="6" height="30" fill="#fff" opacity=".7" /><circle cx="70" cy="60" r="10" fill="#fff" opacity=".6" /><circle cx="130" cy="60" r="10" fill="#fff" opacity=".6" /></g>,
    <g key="b"><rect x="30" y="20" width="140" height="70" rx="4" fill="#fff" opacity=".85" /><path d="M45 75 L85 45 L110 65 L130 50 L155 75 Z" fill={color} opacity=".5" /></g>,
    <g key="c"><rect x="25" y="25" width="60" height="80" rx="3" fill="#fff" opacity=".6" /><rect x="115" y="25" width="60" height="80" rx="3" fill="#fff" opacity=".6" /><line x1="55" y1="25" x2="55" y2="105" stroke={color} strokeWidth="2" /><line x1="145" y1="25" x2="145" y2="105" stroke={color} strokeWidth="2" /></g>,
  ]
  return (
    <svg viewBox="0 0 200 120" className={`block w-full rounded-lg ${className}`} role="img" aria-label={label}>
      <rect width="200" height="120" fill={color} />
      {shapes[i % 3]}
    </svg>
  )
}

export function Empty({ children }) {
  return <p className="rounded-lg bg-white p-4 text-center text-grey-ink ring-1 ring-grey/15">{children}</p>
}
