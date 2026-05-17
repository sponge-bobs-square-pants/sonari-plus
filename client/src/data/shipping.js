// Orders with a subtotal at or above this ship free across India.
// Single source of truth for the cart and checkout. (The AnnouncementBar
// copy still hardcodes ₹2,000 — point it here if that bar goes dynamic.)
//
// NOTE: the server re-declares both values in orderController.js — it
// computes the real total and must never trust the client. Keep them
// in sync.
export const FREE_DELIVERY_THRESHOLD = 2000

// Flat delivery charge on orders below the free-delivery threshold.
export const DELIVERY_FEE = 120
