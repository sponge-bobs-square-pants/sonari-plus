# nuit — Future Upgrades & Refinements

A running backlog of things worth improving once the core store is live and
stable. Nothing here is broken — these are *refinements*. Pick them up when
traffic, time, or need justifies the effort.

Tags: **[P1]** do before/around launch · **[P2]** soon after · **[P3]** when it
matters at scale.

---

## Payments & orders

### Stock reservation [P2]
Today stock is checked at `/orders/create` and decremented only on payment
success. A narrow race remains: two customers, the last unit, the seconds
between "clicked Pay" and "finished paying".
**Fix:** claim stock at checkout-start with a *single atomic conditional*
`updateOne` (`$inc` guarded by `stock >= qty` — the loser gets
`modifiedCount: 0` and is rejected), plus a background job that releases stock
from orders stuck at `paymentStatus: 'created'` past a timeout, and on the
`payment.failed` webhook. Set `expire_by` on the Razorpay order to match.

### Admin order management [P1]
**Done:** the `/admin/orders` list + two-column master/detail, filters,
New/seen tracking, the per-order Razorpay verification check, Bill of
Supply generation (`→ accepted`), and the **order fulfilment controls** —
admin dispatch (courier + tracking ID, `accepted → dispatched`), `→
delivered` (stamps `returnDeadline`), and `→ failed-delivery`. All guard
`paymentStatus === 'paid'` and the required current status.

**Next — customer order-tracking UI** (the active piece of work): the
account "Track" button (today a placeholder) goes live once an order has
`courier` + `trackingId`. **Decided — the proxied approach:** our backend
calls each courier's tracking API (Delhivery / BlueDart / India Post) and
we render the status timeline in-app. The order's `courier` field tells the
backend which API to call. Needs a tracking-API account/credentials with
each courier — set up when this is built.

### Refund processing [P2]
The Refund & Cancellation *policy* exists; actually *issuing* refunds does not.
When an admin approves a return, call Razorpay's refunds API and handle the
`refund.processed` webhook to reflect it on the order.

### Order emails [P2]
No transactional email anywhere. **The plan:** on the Razorpay **webhook**
confirmation, send the customer an order-received acknowledgment. Two rules
when building it:
- Send it **inside the `paymentStatus !== 'paid'` idempotency guard** in
  `razorpayWebhook` — so it fires exactly once per order, never on retries.
- Make the send **best-effort** — wrap it so a mail failure can NEVER fail
  the webhook response, or Razorpay will retry the whole webhook.
Shipping-update emails (dispatched, etc.) come later, same provider.
**Blocked:** needs an email provider + a sending domain — set up once the
store domain is purchased.

### Order detail / history [P2]
`/order/confirmed` reads the order from router state — a refresh loses it. Add
a real order-detail route (`GET /api/orders/:id`) and let the account
"Purchases" list open into it.

---

## Storefront & UX

### Wishlist / Favourites [P2]
The account "Favourites" tab is an empty placeholder. Build a real saved-items
feature (and re-add the heart icon to the header).

### Guest checkout [P3]
Checkout currently requires sign-in. Consider allowing a guest to check out
with just an email + address.

### Shop scroll restoration [P3]
Returning from a product page to `/shop` resets the infinite-scroll position
to the top. Persist scroll offset + loaded pages (sessionStorage) and restore.

### About page copy [P3]
"How it began" still reads like a recent founding — reword it to fit the
1999 origin date.

---

## Admin

### "Configure landing page" tool [P2]
`/admin/landing` is a stub. Build the tool to control hero / featured pieces /
section order.

### Product search at scale [P3]
Admin product search uses an unanchored `$regex` — fine now, can't use an index
well at tens of thousands of products. Add a MongoDB text index on `name`.

---

## Backend wiring

### Contact form backend [P2]
The `/contact` form is front-end only (`// TODO POST /api/contact`). Build the
route — store the message and/or email it to the store.

### Newsletter backend [P2]
The homepage Newsletter section has no API. Build the subscribe route.

---

## Performance

### Image optimization [P2]
Category images are large (~900 KB each). Serve responsive/transformed sizes
(Cloudinary transformations) and proper formats.

### Cheaper asset storage [P3]
Cloudinary hosts everything — product images, and (once built) invoice PDFs.
At scale a cheaper object store (AWS S3, Cloudflare R2, Backblaze B2) would
cut cost. A migration touches the upload path (`POST /api/upload`), every
stored asset URL, and invoice hosting. Not urgent — revisit when storage
cost actually bites.

### Cursor pagination for `/shop` [P3]
`/shop` uses skip/limit pagination — fine for normal browsing. If very deep
scrolling becomes common, `.skip()` slows down; switch to cursor-based.

---

## Security & hardening

### Rate limiting [P2]
Add rate limiting on auth (`/auth/login`, `/auth/register`) and order endpoints
to blunt brute-force and abuse.

### Constants kept in sync [P3]
`FREE_DELIVERY_THRESHOLD` / `DELIVERY_FEE` are declared twice — `data/shipping.js`
(client) and `orderController.js` (server). They must be edited together; a
shared/config source would remove the foot-gun.

---

## Compliance & launch

### Legal review [P1]
Privacy Policy, Terms & Conditions, and Refund & Cancellation are solid
standard templates — have them reviewed against Indian law (DPDP Act 2023, IT
Act) and the payment provider's requirements before going live.

### Go-live checklist [P1]
- Razorpay: set `NODE_ENV=production` and uncomment the `RAZORPAY_PROD_*` keys
  (the code switches automatically).
- Update the webhook URL from the devtunnel to the real domain.
- Run `npm run backfill:price` against the production DB if needed.
- Confirm all contact details on `/contact` are correct.
