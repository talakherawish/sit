import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useL, usePersonName } from '../lib/hooks'
import { dateOf, normPhone } from '../lib/logic'
import BookingPlanner from '../components/BookingPlanner'
import RoomAvailability from '../components/RoomAvailability'
import { Modal, ScreenId, SectionLabel } from '../components/ui'
import { PhotoCarousel } from '../components/RoomPhoto'
import Icon from '../components/Icon'
import { SignUpForm } from '../renter/Auth'
import { StaffTitle } from './StaffLayout'

/**
 * S-07 Book for someone: the renter's Book ahead form at the desk. Pick who it's for (search, or add a
 * new renter), then days → repeat → from / to → a room on the map → what they're here to do → Confirm.
 * The renter gets an SMS and an alert; reception sees the same receipt. Opened from the sidebar, from
 * Rooms today, or from a person on Check-in (already picked).
 */
export function BookFor() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const renters = useStore((s) => s.data.renters)
  const [renterId, setRenterId] = useState(() => (renters.some((r) => r.id === params.get('renter')) ? params.get('renter') : null))
  const [availability, setAvailability] = useState(null) // room id shown in "See availability"

  return (
    <>
      <StaffTitle id="S-07" title={t('staff_book.title')} />
      <BookingPlanner
        desk
        planKey="staffPlan"
        createdBy="staff"
        source="staff"
        renterId={renterId}
        before={<WhoFor renterId={renterId} onPick={setRenterId} />}
        roomLink={(id) => (
          <button className="btn-link shrink-0 !text-[15px]" onClick={() => setAvailability(id)}>
            {t('staff_book.see_availability')}
            <Icon name="next" size={16} className="rtl:rotate-180" />
          </button>
        )}
      />
      {availability && <AvailabilityModal id={availability} onClose={() => setAvailability(null)} />}
    </>
  )
}

/** "Who is it for?": search renters by name or phone, or add someone new; then their name with Change. */
function WhoFor({ renterId, onPick }) {
  const { t } = useTranslation()
  const pn = usePersonName()
  const s = useStore()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const renter = s.data.renters.find((r) => r.id === renterId)
  const ql = q.trim().toLowerCase()
  const results = ql
    ? s.data.renters.filter(
        (r) => [r.name, r.name_ar].some((n) => n?.toLowerCase().includes(ql)) || (normPhone(ql) && normPhone(r.phone).includes(normPhone(ql))),
      )
    : []
  const upcoming = (id) =>
    s.data.bookings.filter((b) => b.renter_id === id && b.date >= dateOf(s.now) && ['awaiting_confirmation', 'confirmed'].includes(b.status)).length

  return (
    <section>
      <SectionLabel>{t('staff_book.who')}</SectionLabel>
      {renter ? (
        <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy text-[16px] font-semibold text-white">{pn(renter)[0]}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">{pn(renter)}</span>
            <span className="block text-[13px] text-grey-ink" dir="ltr">
              {[renter.phone, renter.email].filter(Boolean).join(' · ')}
            </span>
          </span>
          <button className="btn-link shrink-0 !text-[15px]" onClick={() => onPick(null)}>
            {t('staff_book.change')}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface p-3">
          <label className="relative block">
            <span className="sr-only">{t('staff_book.search')}</span>
            <Icon name="search" className="absolute start-3 top-3 text-grey-ink" />
            <input className="input !bg-white !ps-11" autoFocus placeholder={t('staff_book.search')} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {ql && (
            <ul className="mt-2 divide-y divide-black/[0.06] overflow-hidden rounded-xl bg-white" aria-live="polite">
              {!results.length && <li className="px-4 py-3 text-[15px] text-grey-ink">{t('staff_book.none')}</li>}
              {results.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <button className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-start hover:bg-black/[0.03]" onClick={() => onPick(r.id)}>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{pn(r)}</span>
                      <span className="block text-[13px] text-grey-ink" dir="ltr">
                        {r.phone}
                      </span>
                    </span>
                    <span className="text-[13px] text-grey-ink">{t('staff_book.upcoming', { count: upcoming(r.id) })}</span>
                    <Icon name="next" size={16} className="text-grey-ink/60 rtl:rotate-180" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="btn-link mt-2 !text-[15px]" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            {t('staff_book.new_renter')}
          </button>
        </div>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title={t('staff_book.new_renter')}>
        <ScreenId id="R-10" />
        <SignUpForm
          onExisting={(r) => {
            onPick(r.id)
            setAdding(false)
          }}
          onDone={(f) => {
            const id = s.createRenter(f)
            onPick(id)
            setAdding(false)
            s.showToast('toast.account_created', { name: f.name })
          }}
        />
      </Modal>
    </section>
  )
}

/**
 * A room at a glance, the way renters see it on Today: photos, then its month of availability and the
 * picked day's bookings (today first). Used by "See availability" here and by room names on Rooms today.
 */
export function AvailabilityModal({ id, onClose }) {
  const { t } = useTranslation()
  const L = useL()
  const data = useStore((s) => s.data)
  const now = useStore((s) => s.now)
  const [day, setDay] = useState(dateOf(now))
  const sp = data.spaces.find((x) => x.id === id)
  return (
    <Modal open onClose={onClose} title={L(sp.label)}>
      <PhotoCarousel space={sp} className="mb-3" />
      <p className="mb-5 text-[15px] text-grey-ink">
        {t('map.people', { n: sp.capacity })} · {sp.size_m2} m² · {sp.features.map((f) => t(`feature.${f}`)).join(' · ')}
      </p>
      <RoomAvailability id={id} day={day} onDay={setDay} readOnly />
    </Modal>
  )
}
