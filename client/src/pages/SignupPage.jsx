import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import {
  register,
  clearAuthError,
  selectAuthUser,
  selectAuthStatus,
  selectAuthError,
} from '../features/auth/authSlice'
import AuthLayout from '../components/auth/AuthLayout'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'

export default function SignupPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const user = useSelector(selectAuthUser)
  const status = useSelector(selectAuthStatus)
  const error = useSelector(selectAuthError)

  const [form, setForm] = useState({ name: '', email: '', password: '' })

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  useEffect(() => () => dispatch(clearAuthError()), [dispatch])

  const update = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    dispatch(register(form))
  }

  return (
    <AuthLayout
      intro="Join Sonari"
      title="Create your account"
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            replace
            className="text-ink underline underline-offset-4"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <TextField
          label="Name"
          name="name"
          value={form.name}
          onChange={update}
          required
          autoComplete="name"
        />
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
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-clay">At least 8 characters.</p>

        {error && <p className="text-xs text-dusk">{error}</p>}

        <Button
          type="submit"
          variant="solid"
          className="w-full"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-xs leading-relaxed text-clay">
          By creating an account, you agree to our{' '}
          <Link
            to="/terms"
            className="text-ink underline underline-offset-2 transition-colors hover:text-clay"
          >
            Terms &amp; Conditions
          </Link>{' '}
          and{' '}
          <Link
            to="/privacy"
            className="text-ink underline underline-offset-2 transition-colors hover:text-clay"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  )
}
