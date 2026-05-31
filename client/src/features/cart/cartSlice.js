import { createSlice } from '@reduxjs/toolkit'
import { logout } from '../auth/authSlice'
import { readCart } from './cartStorage'

// Hydrate from the guest store so a signed-out visitor's bag survives
// a refresh. If they turn out to be signed in, the merge-on-login
// listener replaces this with their DB cart shortly after boot.
const initialState = {
  items: readCart(),
}

/**
 * A cart line is unique per product + colour + size + cup — together they
 * identify exactly one buyable variant. (cup is bras-only; empty otherwise,
 * so non-bra lines key exactly as before.)
 */
const lineKey = (item) =>
  `${item.productId}__${item.color}__${item.size}__${item.cup || ''}`

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // payload: { productId, name, company, image, color, hex, size, cup,
    //   price, mrp, quantity }
    // `price` is the (potentially discounted) charge per unit; `mrp` is the
    // un-discounted MRP for the struck-through display — null when there's
    // no discount. ProductPage normalises this so non-discounted lines
    // arrive here with mrp: null.
    addItem: (state, action) => {
      const item = action.payload
      const lineId = lineKey(item)
      const existing = state.items.find((i) => i.lineId === lineId)
      if (existing) {
        // Same variant already in the bag — just add to its quantity. We
        // also refresh price/mrp from the new payload so adding a second
        // unit while the merchandiser just launched a discount picks up
        // the new pricing without forcing the user to clear their bag.
        existing.quantity += item.quantity || 1
        existing.price = item.price
        existing.mrp = item.mrp ?? null
      } else {
        state.items.push({
          ...item,
          mrp: item.mrp ?? null,
          lineId,
          quantity: item.quantity || 1,
        })
      }
    },

    // payload: lineId
    removeItem: (state, action) => {
      state.items = state.items.filter((i) => i.lineId !== action.payload)
    },

    // payload: { lineId, quantity }
    updateQuantity: (state, action) => {
      const { lineId, quantity } = action.payload
      const item = state.items.find((i) => i.lineId === lineId)
      if (!item) return
      if (quantity <= 0) {
        state.items = state.items.filter((i) => i.lineId !== lineId)
      } else {
        item.quantity = quantity
      }
    },

    clearCart: (state) => {
      state.items = []
    },

    // payload: items[] — replace the whole cart, e.g. after a DB sync.
    setCart: (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : []
    },
  },

  // The bag belongs to the signed-in session — empty it on logout so
  // the next person doesn't inherit the previous user's cart.
  extraReducers: (builder) => {
    builder.addCase(logout.fulfilled, (state) => {
      state.items = []
    })
  },
})

export const { addItem, removeItem, updateQuantity, clearCart, setCart } =
  cartSlice.actions

/* ── Selectors ────────────────────────────────── */
export const selectCartItems = (state) => state.cart.items
export const selectCartCount = (state) =>
  state.cart.items.reduce((total, item) => total + item.quantity, 0)
export const selectCartTotal = (state) =>
  state.cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  )

export default cartSlice.reducer
