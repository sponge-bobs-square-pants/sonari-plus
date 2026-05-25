import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { api } from '../services/apiClient'
import { loadUser } from '../features/auth/authSlice'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'

/* Landing page for the verification link in the email. Reads ?token, posts
   it to the API, and shows the outcome. The token is the proof, so this
   works whether or not the visitor is logged in on this device. */
export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const dispatch = useDispatch()
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [message, setMessage] = useState('')
  const ran = useRef(false) // guard StrictMode's double-effect

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!token) {
      setStatus('error')
      setMessage('This link is missing its verification token.')
      return
    }
    api
      .post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success')
        // Re-sync the actual logged-in user (if any) from the server — the
        // verified account is the TOKEN's owner, which may not be whoever is
        // logged in on this device. Never blindly flip the local user.
        dispatch(loadUser())
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message)
      })
  }, [token, dispatch])

  return (
    <>
      <Header solid border={false} />
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6 pb-24 pt-28">
        <div className="w-full max-w-md text-center">
          {status === 'verifying' && (
            <p className="text-sm text-clay">Verifying your email…</p>
          )}

          {status === 'success' && (
            <>
              <p className="eyebrow text-clay">Email verified</p>
              <h1 className="mt-3 font-display text-3xl font-light text-ink">
                You&rsquo;re all set
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-clay">
                Your email is confirmed — thanks for verifying.
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Button as={Link} to="/shop" variant="solid">
                  Start shopping
                </Button>
                <Button as={Link} to="/account" variant="outline">
                  My account
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="eyebrow text-dusk">Verification failed</p>
              <h1 className="mt-3 font-display text-3xl font-light text-ink">
                Link expired or invalid
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-clay">{message}</p>
              <p className="mt-2 text-sm leading-relaxed text-clay">
                Sign in and request a fresh link from your account.
              </p>
              <div className="mt-8 flex justify-center">
                <Button as={Link} to="/account" variant="solid">
                  Go to my account
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
