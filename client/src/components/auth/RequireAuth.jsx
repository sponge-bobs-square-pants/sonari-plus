import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import {
  selectAuthUser,
  selectAuthInitializing,
} from '../../features/auth/authSlice'

/**
 * Route guard — renders children only for logged-in users.
 *
 * While `initializing` (the first /auth/me call hasn't resolved),
 * it renders nothing — this avoids a flicker where a logged-in user
 * is briefly bounced to /login before their session is restored.
 */
export default function RequireAuth({ children }) {
  const user = useSelector(selectAuthUser)
  const initializing = useSelector(selectAuthInitializing)
  const location = useLocation()

  if (initializing) return null
  if (!user) {
    // Remember where they were headed, so login can send them back.
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
