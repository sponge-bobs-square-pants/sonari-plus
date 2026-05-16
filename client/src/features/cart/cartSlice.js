import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  items: [],
}

/**
 * A cart line is unique per product + colour + size — those three
 * together identify exactly one buyable variant. Two sizes of the
 * same product are two separate lines.
 */
const lineKey = (item) => `${item.productId}__${item.color}__${item.size}`

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // payload: { productId, name, company, image, color, hex, size, price, quantity }
    addItem: (state, action) => {
      const item = action.payload
      const lineId = lineKey(item)
      const existing = state.items.find((i) => i.lineId === lineId)
      if (existing) {
        // Same variant already in the bag — just add to its quantity.
        existing.quantity += item.quantity || 1
      } else {
        state.items.push({ ...item, lineId, quantity: item.quantity || 1 })
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
  },
})

export const { addItem, removeItem, updateQuantity, clearCart } =
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
