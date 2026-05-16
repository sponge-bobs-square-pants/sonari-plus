// Orders with a subtotal at or above this ship free across India.
// Single source of truth — used by the cart page now, and by the
// checkout flow when it's built. (The AnnouncementBar copy still
// hardcodes ₹2,000 — point it here if that bar ever becomes dynamic.)
export const FREE_DELIVERY_THRESHOLD = 2000
