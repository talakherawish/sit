import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import i18n from '../i18n'
import { space } from './logic'
import { fmtDate } from './time'

/** Picks the current language from an { en, ar } object. */
export function useL() {
  const lang = useStore((s) => s.lang)
  return (o) => (o && typeof o === 'object' ? (o[lang] ?? o.en) : (o ?? ''))
}

export function useSpaceName() {
  const data = useStore((s) => s.data)
  const L = useL()
  return (id, short) => {
    if (id === 'public') return L(data.zones[0].name)
    const sp = space(data, id)
    return sp ? L(short ? sp.short : sp.label) : ''
  }
}

/** Renders a stored message / notification template in the current language. */
export function useTemplate() {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const name = useSpaceName()
  const L = useL()
  return (tpl, p = {}) =>
    t(`msg.${tpl}`, {
      ...p,
      room: p.spaceId ? name(p.spaceId) : '',
      date: p.date ? fmtDate(p.date, lang) : '',
      text: L(p.text),
      status: p.status ? t(`report_status.${p.status}`) : '',
      why: p.why ? t(`release_why.${p.why}`) : '',
      reason: p.reason || '',
    })
}

/** Navigate to a renter-only screen, opening the login sheet (R-09) for guests. */
export function useRequireLogin() {
  const navigate = useNavigate()
  const renterId = useStore((s) => s.renterId)
  const set = useStore((s) => s.set)
  return (target) => (renterId ? navigate(target) : set({ gate: { returnTo: target } }))
}

/** Keeps i18next, <html lang> and dir in sync with the store. */
export function useLangSync() {
  const lang = useStore((s) => s.lang)
  useEffect(() => {
    i18n.changeLanguage(lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])
}

// Reviewer shortcut: tapping the logo three times opens the prototype panel (it has no visible tab).
let taps = []
export function openPanelOnTripleTap() {
  const now = Date.now()
  taps = [...taps.filter((t) => now - t < 700), now]
  if (taps.length >= 3) {
    taps = []
    useStore.getState().set({ drawerOpen: true })
  }
}

/** Reception staff on duty (the only staff account in the prototype). */
export const STAFF = { name: 'Rana', name_ar: 'رنا' }

/** A person's name in the current language (the Arabic spelling when there is one). `first` gives the first name only. */
export function usePersonName() {
  const lang = useStore((s) => s.lang)
  return (r, first = false) => {
    if (!r) return ''
    const n = (lang === 'ar' && r.name_ar) || r.name
    return first ? n.split(' ')[0] : n
  }
}
