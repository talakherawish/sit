// All times are plain numbers so the time simulator can jump freely.
// date = 'YYYY-MM-DD', min = minutes since midnight, abs = minutes since epoch (UTC, no time zones).
export const DAY = 1440

export const dateToDay = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000
export const dayToDate = (n) => new Date(n * 86400000).toISOString().slice(0, 10)
export const abs = (date, min) => dateToDay(date) * DAY + min
export const split = (a) => ({ date: dayToDate(Math.floor(a / DAY)), min: ((a % DAY) + DAY) % DAY })
export const weekday = (date) => new Date(dateToDay(date) * 86400000).getUTCDay()
export const addDays = (date, n) => dayToDate(dateToDay(date) + n)
export const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
export const parseHm = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5)
export const ceil30 = (min) => Math.ceil(min / 30) * 30
export const floor30 = (min) => Math.floor(min / 30) * 30

const locale = (lang) => (lang === 'ar' ? 'ar-PS-u-nu-latn' : 'en-GB')

export function fmtDate(date, lang, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat(locale(lang), { ...opts, timeZone: 'UTC' }).format(new Date(dateToDay(date) * 86400000))
}
export const fmtAbs = (a, lang) => {
  const { date, min } = split(a)
  return `${fmtDate(date, lang)} · ${hm(min)}`
}
export const weekdayName = (wd, lang) =>
  new Intl.DateTimeFormat(locale(lang), { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 9, 4 + wd)))
