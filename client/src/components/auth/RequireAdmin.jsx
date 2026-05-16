import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import {
  selectAuthUser,
  selectAuthInitializing,
} from '../../features/auth/authSlice'

/**
 * Route guard — renders children only for admins.
 *  - not logged in  → /login
 *  - logged in, not admin → / (home)
 *
 * This is a UX gate only. The real enforcement is the `requireAdmin`
 * middleware on the server — never trust the client for authorization.
 */
export default function RequireAdmin({ children }) {
  const user = useSelector(selectAuthUser)
  const initializing = useSelector(selectAuthInitializing)

  if (initializing) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}
