import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../services/apiClient'

/* ── Async thunks ─────────────────────────────────
   Each calls the API and returns the `user` object. The auth
   token rides along in the httpOnly cookie, so it is never stored
   in Redux — only the user profile is.                          */

export const register = createAsyncThunk(
  'auth/register',
  async (form, { rejectWithValue }) => {
    try {
      const { user } = await api.post('/auth/register', form)
      return user
    } catch (err) {
      return rejectWithValue(err.message)
    }
  },
)

export const login = createAsyncThunk(
  'auth/login',
  async (form, { rejectWithValue }) => {
    try {
      const { user } = await api.post('/auth/login', form)
      return user
    } catch (err) {
      return rejectWithValue(err.message)
    }
  },
)

// Restore the session on app load — the cookie is sent automatically.
// A failure here just means "not logged in", which is not an error.
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const { user } = await api.get('/auth/me')
      return user
    } catch {
      return rejectWithValue(null)
    }
  },
)

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout')
})

const initialState = {
  user: null,
  status: 'idle', // idle | loading | authenticated | error
  initializing: true, // true until the first loadUser settles
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = 'authenticated'
        state.initializing = false
      })
      .addCase(loadUser.rejected, (state) => {
        state.user = null
        state.initializing = false
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.status = 'idle'
      })

    // register + login share identical pending/fulfilled/rejected logic
    for (const thunk of [register, login]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.status = 'loading'
          state.error = null
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.user = action.payload
          state.status = 'authenticated'
        })
        .addCase(thunk.rejected, (state, action) => {
          state.status = 'error'
          state.error = action.payload || 'Something went wrong'
        })
    }
  },
})

export const { clearAuthError } = authSlice.actions

/* ── Selectors ────────────────────────────────── */
export const selectAuthUser = (state) => state.auth.user
export const selectAuthStatus = (state) => state.auth.status
export const selectAuthError = (state) => state.auth.error
export const selectAuthInitializing = (state) => state.auth.initializing
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin'

export default authSlice.reducer
