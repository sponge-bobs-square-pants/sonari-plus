import { configureStore } from '@reduxjs/toolkit'
import cartReducer from '../features/cart/cartSlice'
import authReducer from '../features/auth/authSlice'
import { cartListener } from '../features/cart/cartListener'

// The single Redux store for the whole app.
// Add new slice reducers to the `reducer` map as features grow.
export const store = configureStore({
  reducer: {
    cart: cartReducer,
    auth: authReducer,
  },
  // The cart listener mirrors cart changes to localStorage / the DB
  // and merges the guest bag on sign-in.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(cartListener.middleware),
})
