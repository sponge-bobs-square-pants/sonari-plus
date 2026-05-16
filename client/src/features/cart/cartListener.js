import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { addItem, removeItem, updateQuantity, clearCart, setCart } from './cartSlice'
import { loadUser, login, register, logout } from '../auth/authSlice'
import { saveCart, mergeCart } from '../../services/cartApi'
import { writeCart, clearStoredCart } from './cartStorage'

/**
 * Keeps the cart persisted outside Redux:
 *  - signed out → the bag lives in localStorage (survives refresh)
 *  - signed in  → the bag lives in the DB
 *  - on sign-in → the local guest bag is merged into the DB bag
 *  - on logout  → the guest store is cleared (Redux is emptied by the
 *                 slice's logout reducer)
 *
 * The plain cart reducers stay synchronous so the UI updates instantly;
 * this middleware mirrors each change to the right store afterwards.
 */
export const cartListener = createListenerMiddleware()

// Persist every cart mutation. `setCart` is intentionally excluded —
// it's how a DB sync writes INTO Redux, so re-persisting would loop.
cartListener.startListening({
  matcher: isAnyOf(addItem, removeItem, updateQuantity, clearCart),
  effect: async (_action, api) => {
    if (!api.getState().auth.user) {
      writeCart(api.getState().cart.items) // guest → localStorage
      return
    }
    // Signed in → DB. Debounce so a burst of edits is one request.
    api.cancelActiveListeners()
    await api.delay(450)
    try {
      await saveCart(api.getState().cart.items)
    } catch {
      /* transient/offline — Redux still holds the cart */
    }
  },
})

// When auth settles on a real user (boot, login or register), fold the
// local guest bag into their DB bag and adopt the merged result.
cartListener.startListening({
  matcher: isAnyOf(loadUser.fulfilled, login.fulfilled, register.fulfilled),
  effect: async (_action, api) => {
    if (!api.getState().auth.user) return // loadUser may resolve to none
    const localItems = api.getState().cart.items
    try {
      const merged = await mergeCart(localItems)
      api.dispatch(setCart(merged))
      clearStoredCart()
    } catch {
      /* merge failed — keep the local cart as-is */
    }
  },
})

// On logout the slice empties Redux; clear the guest store to match.
cartListener.startListening({
  actionCreator: logout.fulfilled,
  effect: () => clearStoredCart(),
})
