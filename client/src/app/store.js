import { configureStore } from '@reduxjs/toolkit'
import cartReducer from '../features/cart/cartSlice'
import authReducer from '../features/auth/authSlice'

// The single Redux store for the whole app.
// Add new slice reducers to the `reducer` map as features grow.
export const store = configureStore({
  reducer: {
    cart: cartReducer,
    auth: authReducer,
  },
})
