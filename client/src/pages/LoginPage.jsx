import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  login,
  clearAuthError,
  selectAuthUser,
  selectAuthStatus,
  selectAuthError,
} from '../features/auth/authSlice'
import AuthLayout from '../components/auth/AuthLayout'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import { BRAND } from '../data/brand'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const user = useSelector(selectAuthUser)
  const status = useSelector(selectAuthStatus)
  const error = useSelector(selectAuthError)

  const [form, setForm] = useState({ email: '', password: '' })

  // Where to go after login — back to the page that sent us here, or home.
  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, navigate, from])

  // Clear any stale error when leaving the page.
  useEffect(() => () => dispatch(clearAuthError()), [dispatch])

  const update = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    dispatch(login(form))
  }

  return (
    <AuthLayout
      intro="Welcome back"
      title={`Log in to ${BRAND.name}`}
      footer={
        <>
          New to {BRAND.name}?{' '}
          <Link
            to="/signup"
            replace
            className="text-ink underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <TextField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={update}
          required
          autoComplete="email"
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={update}
          required
          autoComplete="current-password"
        />

        {error && <p className="text-xs text-dusk">{error}</p>}

        <Button
          type="submit"
          variant="solid"
          className="w-full"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
