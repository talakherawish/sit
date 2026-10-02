import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { minOfDay } from '../lib/logic'
import { hm } from '../lib/time'
import Icon, { TechnoparkLogo } from '../components/Icon'

const BASE = import.meta.env.BASE_URL

// Logical sizes, scaled together to fit the window.
const PHONE = { w: 390, h: 800, bezel: 11, status: 44 }
const PHONE_W = PHONE.w + PHONE.bezel * 2
const PHONE_H = PHONE.h + PHONE.status + PHONE.bezel * 2
const DESK = { w: 1280, h: 800, bar: 36 }
const DESK_H = DESK.h + DESK.bar
const GAP = 40
// "Time & scenarios" button hidden while we rework it; the panel still opens with Ctrl+. or a triple tap on the staff logo.
const SHOW_PANEL_BUTTON = false

/**
 * Presentation view: Tala's phone and Rana's reception dashboard side by side. Both are the real app in
 * frames on the same origin, so they share the same live data (see store/sync.js).
 */
export default function Demo() {
  const { t } = useTranslation()
  const set = useStore((s) => s.set)
  const reset = useStore((s) => s.reset)
  const now = useStore((s) => s.now)
  const stage = useRef(null)
  const [scale, setScale] = useState(0.6)
  const [frames, setFrames] = useState(0) // bump to reload both screens

  useEffect(() => {
    const fit = () => {
      const el = stage.current
      if (!el) return
      const w = el.clientWidth - 24
      const h = el.clientHeight - 64 // room for the labels
      setScale(Math.min(1, w / (PHONE_W + GAP + DESK.w), h / Math.max(PHONE_H, DESK_H)))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-black/[0.06] bg-white px-6 py-3">
        <TechnoparkLogo />
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold">{t('demo.title')}</h1>
          <p className="text-[13px] text-grey-ink">{t('demo.hint')}</p>
        </div>
        {SHOW_PANEL_BUTTON && (
          <button className="btn-secondary !min-h-10 !text-[15px]" onClick={() => set({ drawerOpen: true })}>
            <Icon name="clock" size={18} />
            {t('demo.panel')}
          </button>
        )}
        <button
          className="btn-secondary !min-h-10 !text-[15px]"
          onClick={() => {
            reset()
            setFrames(frames + 1)
          }}
        >
          {t('demo.reset')}
        </button>
      </header>

      <div ref={stage} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden" dir="ltr">
        <div className="flex items-start" style={{ gap: GAP * scale }}>
          <figure>
            <div style={{ width: PHONE_W * scale, height: PHONE_H * scale }}>
              <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <div
                  className="rounded-[58px] bg-[#1b1b1d] shadow-[0_30px_80px_rgba(16,24,40,0.28),inset_0_0_0_1.5px_#3a3a3d]"
                  style={{ padding: PHONE.bezel, width: PHONE_W, height: PHONE_H }}
                >
                  <div className="relative h-full overflow-hidden rounded-[47px] bg-white">
                    <div className="relative flex items-center justify-between px-8 pt-1" style={{ height: PHONE.status }} aria-hidden="true">
                      <span className="w-14 text-center text-[16px] font-semibold tracking-tight">{hm(minOfDay(now))}</span>
                      <span className="absolute top-[11px] left-1/2 h-[30px] w-[110px] -translate-x-1/2 rounded-full bg-black" />
                      <span className="flex gap-1.5 text-[13px] font-semibold">
                        <Icon name="wifi" size={16} />
                        100%
                      </span>
                    </div>
                    <iframe
                      key={`r${frames}`}
                      title={t('demo.renter')}
                      src={`${BASE}r/home`}
                      style={{ width: PHONE.w, height: PHONE.h }}
                      className="block border-0"
                    />
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="mt-3 text-center text-[13px] font-medium text-grey-ink">{t('demo.renter')}</figcaption>
          </figure>

          <figure>
            <div style={{ width: DESK.w * scale, height: DESK_H * scale }}>
              <div style={{ width: DESK.w, height: DESK_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <div className="overflow-hidden rounded-[14px] bg-white shadow-[0_30px_80px_rgba(16,24,40,0.22)] ring-1 ring-black/10">
                  <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f6f6f8] px-4" style={{ height: DESK.bar }} aria-hidden="true">
                    <span className="size-3 rounded-full bg-[#ff5f57]" />
                    <span className="size-3 rounded-full bg-[#febc2e]" />
                    <span className="size-3 rounded-full bg-[#28c840]" />
                    <span className="flex-1 text-center text-[13px] text-grey-ink">{t('demo.staff')}</span>
                  </div>
                  <iframe
                    key={`s${frames}`}
                    title={t('demo.staff')}
                    src={`${BASE}s/today`}
                    style={{ width: DESK.w, height: DESK.h }}
                    className="block border-0"
                  />
                </div>
              </div>
            </div>
            <figcaption className="mt-3 text-center text-[13px] font-medium text-grey-ink">{t('demo.staff')}</figcaption>
          </figure>
        </div>
      </div>
    </div>
  )
}
