import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useSpaceName } from '../lib/hooks'
import { fmtDate, hm } from '../lib/time'
import { Overlay } from './ui'
import Icon from './Icon'

/**
 * The booking receipt that replaces Review in Book ahead: it rises from the bottom of the screen,
 * holds for a moment so it can be read, then leaves off the top. Tap to send it on its way sooner.
 * `bookings` are the ones just made; `email` is where the receipt was sent.
 */
export default function Receipt({ bookings, email, reminder, onDone }) {
  const { t } = useTranslation()
  const lang = useStore((s) => s.lang)
  const name = useSpaceName()
  if (!bookings?.length) return null
  const first = bookings[0]
  const last = bookings[bookings.length - 1]
  const rooms = [...new Set(bookings.map((b) => b.space_id))]
  const short = (d) => fmtDate(d, lang, { weekday: 'short', day: 'numeric', month: 'short' })
  const Row = ({ label, children }) => (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="shrink-0 text-[15px] text-grey-ink">{label}</span>
      <span className="min-w-0 text-end text-[15px] font-medium">{children}</span>
    </div>
  )
  return (
    <Overlay>
      {(pos) => (
        <div className={`${pos} inset-0 z-50 flex items-center justify-center overflow-hidden`} role="status" aria-live="polite">
          <div className="animate-fade absolute inset-0 bg-black/25" onClick={onDone} />
          <div className="animate-receipt relative w-[84%] max-w-sm drop-shadow-[0_20px_40px_rgba(16,24,40,0.28)]" onAnimationEnd={onDone} onClick={onDone}>
            <div className="rounded-t-[20px] bg-white px-5 pt-6 pb-4">
              <div className="flex flex-col items-center text-center">
                <span className="grid size-12 place-items-center rounded-full bg-teal text-white">
                  <Icon name="check" size={26} />
                </span>
                <p className="mt-2 font-head text-[24px] font-bold tracking-tight">{t('receipt.title')}</p>
                <p className="text-[13px] text-grey-ink">{t('receipt.count', { count: bookings.length })}</p>
              </div>
              <div className="mt-4 divide-y divide-dashed divide-black/15 border-t border-dashed border-black/15">
                <Row label={t('receipt.room')}>{rooms.map((id) => name(id)).join(' + ')}</Row>
                <Row label={t('receipt.dates')}>{bookings.length > 1 ? `${short(first.date)} – ${short(last.date)}` : short(first.date)}</Row>
                <Row label={t('book.time')}>
                  <span dir="ltr">
                    {hm(first.start)}–{hm(first.end)}
                  </span>
                </Row>
                {first.reason && <Row label={t('review.purpose')}>{t(`reason.${first.reason}`)}</Row>}
                <Row label={t('book.reminder')}>{reminder ? t(`reminder.${reminder}`) : t('book.no_reminder_short')}</Row>
              </div>
              <p className="mt-3 text-center text-[12px] text-grey-ink">{t('confirmed.receipt', { email })}</p>
            </div>
            <div className="receipt-teeth" />
          </div>
        </div>
      )}
    </Overlay>
  )
}
