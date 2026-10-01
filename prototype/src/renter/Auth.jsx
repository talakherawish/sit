import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { Field, ScreenTitle } from '../components/ui'

function PhoneInput({ prefix, setPrefix, number, setNumber }) {
  const { t } = useTranslation()
  return (
    <Field label={t('auth.phone')}>
      <div className="flex gap-2" dir="ltr">
        <select className="input !w-28" value={prefix} onChange={(e) => setPrefix(e.target.value)} aria-label={t('auth.prefix')}>
          <option value="+970">+970</option>
          <option value="+972">+972</option>
        </select>
        <input
          className="input"
          inputMode="tel"
          autoComplete="tel-national"
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/[^\d ]/g, ''))}
          placeholder="59 9123 456"
        />
      </div>
    </Field>
  )
}

const splitPhone = (p = '') => (p.startsWith('+972') ? ['+972', p.slice(4)] : ['+970', p.replace(/^\+970/, '')])

/** Sign-up form (R-10). Also opened from the staff desk as "New walk-in" (US-2 AC2). */
export function SignUpForm({ onExisting, onDone }) {
  const { t } = useTranslation()
  const findByPhoneOrEmail = useStore((s) => s.findByPhoneOrEmail)
  const [name, setName] = useState('')
  const [prefix, setPrefix] = useState('+970')
  const [number, setNumber] = useState('')
  const [email, setEmail] = useState('')
  const [existing, setExisting] = useState(null)
  const phone = `${prefix}${number.replace(/\D/g, '').replace(/^0/, '')}`
  const valid = name.trim().length > 1 && number.replace(/\D/g, '').length >= 8 && /.+@.+\..+/.test(email)
  const submit = (e) => {
    e.preventDefault()
    const found = findByPhoneOrEmail(phone, email)
    if (found) return setExisting(found)
    onDone({ name: name.trim(), phone, email: email.trim() })
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('auth.name')}>
        <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <PhoneInput
        prefix={prefix}
        setPrefix={setPrefix}
        number={number}
        setNumber={(v) => {
          setNumber(v)
          setExisting(null)
        }}
      />
      <Field label={t('auth.email')}>
        <input
          className="input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setExisting(null)
          }}
        />
      </Field>
      {existing && (
        <div className="rounded-lg bg-amber/15 p-3" role="alert">
          <p className="font-semibold">{t('auth.exists')}</p>
          <button type="button" className="btn-link" onClick={() => onExisting(existing)}>
            {t('auth.login_instead')}
          </button>
        </div>
      )}
      <p className="text-sm text-grey-ink">{t('auth.later')}</p>
      <button className="btn-primary w-full" disabled={!valid}>
        {t('auth.continue')}
      </button>
    </form>
  )
}

/** R-10 Sign up */
export function SignUp() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sendCode = useStore((s) => s.sendCode)
  return (
    <>
      <ScreenTitle id="R-10" title={t('auth.signup_title')} back />
      <div className="px-4">
        <SignUpForm
          onExisting={(r) => navigate('/r/login', { state: { phone: r.phone } })}
          onDone={(f) => {
            sendCode({ mode: 'signup', ...f })
            navigate('/r/code')
          }}
        />
        <button className="btn-link mt-2" onClick={() => navigate('/r/login')}>
          {t('auth.have_account')}
        </button>
      </div>
    </>
  )
}

/** R-12 Log in */
export function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const sendCode = useStore((s) => s.sendCode)
  const findByPhoneOrEmail = useStore((s) => s.findByPhoneOrEmail)
  const [p0, n0] = splitPhone(state?.phone)
  const [prefix, setPrefix] = useState(p0)
  const [number, setNumber] = useState(n0)
  const [missing, setMissing] = useState(false)
  const submit = (e) => {
    e.preventDefault()
    const phone = `${prefix}${number.replace(/\D/g, '').replace(/^0/, '')}`
    const r = findByPhoneOrEmail(phone)
    if (!r) return setMissing(true)
    sendCode({ mode: 'login', renterId: r.id, phone: r.phone })
    navigate('/r/code')
  }
  return (
    <>
      <ScreenTitle id="R-12" title={t('auth.login_title')} back />
      <form onSubmit={submit} className="space-y-4 px-4">
        <p className="text-grey-ink">{t('auth.login_body')}</p>
        <PhoneInput
          prefix={prefix}
          setPrefix={setPrefix}
          number={number}
          setNumber={(v) => {
            setNumber(v)
            setMissing(false)
          }}
        />
        {missing && (
          <p className="rounded-lg bg-amber/15 p-3" role="alert">
            {t('auth.no_account')}
          </p>
        )}
        <button className="btn-primary w-full" disabled={number.replace(/\D/g, '').length < 8}>
          {t('auth.send_code')}
        </button>
        <button type="button" className="btn-link" onClick={() => navigate('/r/signup')}>
          {t('auth.new_here')}
        </button>
        <p className="text-xs text-grey-ink">{t('auth.demo_hint')}</p>
      </form>
    </>
  )
}

/** R-11 Enter SMS code */
export function Code() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pending = useStore((s) => s.pendingAuth)
  const completeAuth = useStore((s) => s.completeAuth)
  const sendCode = useStore((s) => s.sendCode)
  const returnTo = useStore((s) => s.returnTo)
  const set = useStore((s) => s.set)
  const [digits, setDigits] = useState(['', '', '', ''])
  const [wait, setWait] = useState(30)
  const refs = useRef([])
  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait(wait - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])
  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  if (!pending) {
    return (
      <>
        <ScreenTitle id="R-11" title={t('auth.code_title')} back />
        <div className="px-4">
          <button className="btn-primary w-full" onClick={() => navigate('/r/login')}>
            {t('nav.login')}
          </button>
        </div>
      </>
    )
  }
  const type = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = d
    setDigits(next)
    if (d && i < 3) refs.current[i + 1]?.focus()
  }
  const verify = (e) => {
    e.preventDefault()
    completeAuth()
    set({ returnTo: null })
    navigate(returnTo || '/r/home', { replace: true })
  }
  return (
    <>
      <ScreenTitle id="R-11" title={t('auth.code_title')} back />
      <form onSubmit={verify} className="space-y-4 px-4">
        <p>{t('auth.code_sent', { phone: pending.phone })}</p>
        <div className="flex justify-center gap-3" dir="ltr">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              inputMode="numeric"
              maxLength={2}
              aria-label={t('auth.digit', { n: i + 1 })}
              onChange={(e) => type(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus()
              }}
              className="size-14 rounded-lg border border-grey/40 bg-white text-center font-head text-2xl font-bold focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none"
            />
          ))}
        </div>
        <p className="text-center text-xs text-grey-ink">{t('auth.any_code')}</p>
        <button className="btn-primary w-full" disabled={digits.some((d) => !d)}>
          {t('auth.verify')}
        </button>
        <button
          type="button"
          className="btn-link mx-auto flex"
          disabled={wait > 0}
          onClick={() => {
            sendCode(pending)
            setWait(30)
          }}
        >
          {wait > 0 ? t('auth.resend_in', { s: wait }) : t('auth.resend')}
        </button>
      </form>
    </>
  )
}
