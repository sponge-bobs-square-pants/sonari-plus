import { useState } from 'react'
import { useSelector } from 'react-redux'
import { selectAuthUser } from '../features/auth/authSlice'
import { api } from '../services/apiClient'

/* Soft nudge for unverified accounts — they can still use the site; this
   just reminds them and offers to resend the link. Renders nothing once
   verified (or signed out). */
export default function VerifyEmailBanner() {
  const user = useSelector(selectAuthUser)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!user || user.emailVerified) return null

  const resend = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post('/auth/resend-verification')
      setSent(true)
    } catch (e) {
      setError(e.message || 'Could not send — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl bg-oat px-5 py-4 ring-1 ring-linen">
      <p className="text-sm text-ink">
        Please verify your email{' '}
        <span className="text-clay">({user.email})</span> — check your inbox for
        the link.
      </p>
      {sent ? (
        <span className="eyebrow text-clay">Sent — check your inbox ✓</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="eyebrow shrink-0 cursor-pointer text-clay underline-offset-4 transition-colors hover:text-ink hover:underline disabled:opacity-40"
        >
          {busy ? 'Sending…' : 'Resend email'}
        </button>
      )}
      {error && <span className="eyebrow text-dusk">{error}</span>}
    </div>
  )
}
