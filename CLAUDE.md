# Sonari Nightwear

A MERN e-commerce store for women's nightwear & intimates (the owner's family
business). `client/` — Vite + React frontend · `server/` — Express + MongoDB API.

This file is a **map**, not a copy — it points to the files where decisions live
so they never go stale. Read the referenced files for detail.

## Running it

- **Server**: `cd server && npm run dev` → http://localhost:5174
  (NOT 5000 — macOS AirPlay Receiver occupies port 5000)
- **Client**: `cd client && npm run dev` → http://localhost:5173
- After editing `server/.env`, **restart the server** — nodemon doesn't watch `.env`.
- First admin account: `cd server && npm run seed:admin`
- Env templates: `server/.env.example`, `client/.env.example`.

## Design system — READ BEFORE building any UI

The brand direction is **"Quiet Gallery / Soft Minimal"** — calm, image-led,
editorial, generous whitespace, restrained. It was chosen through a visual
brainstorm; the exploration screens are the design references:

- `.superpowers/brainstorm/90917-1778870930/content/`
  - `aesthetic-direction.html` — mood (Soft Minimal chosen)
  - `typography.html` — type (Outfit display + Inter body chosen)
  - `design-directions.html` — layout (Quiet Gallery chosen)
  - `landing-sections.html` — homepage section lineup

- **Design tokens** → `client/src/index.css` (the `@theme` block): colours
  `canvas · oat · linen · greige · clay · ink · dusk`; fonts Outfit (display) +
  Inter (body); the `eyebrow` utility; `Reveal` / `build-x` animations.
- **UI kit** → `client/src/components/ui/` — `Button`, `TextField`, `Placeholder`,
  `Icon`, `Reveal`. ALWAYS reuse these; never hardcode colours or fonts.
- Recurring motifs: the growing-line accent, `eyebrow` uppercase labels,
  `Reveal` scroll-in animations, the `build-x` block-wipe (menu overlay).
- Storefront is light (`canvas`); the admin panel is dark (`ink`).
- **Full-screen landing sections**: Hero, CategoryGallery and NewArrivals each
  fill the viewport via `min-h-[calc(100vh-var(--header-height))]` — the
  `--header-height` token (`index.css`) subtracts the fixed navbar so a section
  fits the *visible* area. Supporting rows (ValueProps, Newsletter) stay natural
  height — full-screen is for sections with a visual payload, not utility rows.
  (The old BrandStory "Our story" section was removed — it now lives at `/about`.)

## Conventions

- Prices: always `formatPrice()` from `client/src/utils/format.js` — INR, "₹ 849".
- India-only shipping; free delivery at/over ₹2,000 → `FREE_DELIVERY_THRESHOLD`
  in `client/src/data/shipping.js` (the single source of truth — used by the
  cart page, and by checkout when built). `AnnouncementBar` copy still hardcodes
  the figure; point it at the constant if that bar ever goes dynamic.
- **No fake/sample product data on the storefront.** Use placeholder *states*
  instead — see `client/src/components/sections/NewArrivals.jsx` (it shows tonal
  placeholder cards when no products are tagged "New"). Real data comes from the DB.
- **Product imagery is never cropped** — the owner is firm on this. Cards
  (`ProductCard`) use the photo's natural aspect ratio; the product page
  (`/product/:id`) shows the full image, is white-backgrounded (`bg-white`, not
  `canvas`) so white-background product photos blend seamlessly, and is
  left-aligned with a fixed-width gallery + a 36rem details column. Thumbnails
  may crop (`object-cover object-top` — crop from the bottom, keep the head).
- Route guards render `null` while `auth.initializing` to avoid redirect flicker.
- `<ScrollToTop>` (in `App.jsx`, inside the router) resets scroll on every
  navigation — client-side routing doesn't do this on its own.

## Architecture

- **Auth**: JWT stored in an **httpOnly cookie** (never localStorage). Server:
  `protect` + `requireAdmin` middleware. Client: `RequireAuth` / `RequireAdmin`
  route guards + `features/auth/authSlice.js`. `apiClient` sends `credentials:'include'`.
- **Product model** → `server/src/models/Product.js`: `company` · `colors` →
  `sizes` → `{ price, stock }` · `images` · `featuredImage` (a dedicated
  "New this week" cover) · `gender` (`'' | 'boy' | 'girl'` — only set for the
  `kids` category). `totalStock` is a virtual. `priceFrom` is a **real,
  indexed field** (denormalised from the variant tree) — virtuals can't be
  sorted or range-filtered in Mongo, and `/shop` needs both. Kept in sync by
  `pre('save')` + `pre('findOneAndUpdate')` hooks — never set it by hand.
  Existing rows: `cd server && npm run backfill:price` (one-off).
- **Image uploads**: `POST /api/upload` (admin only) → Cloudinary. The browser
  never sees the Cloudinary secret — uploads proxy through Express.
- Redux store: `cart` + `auth` slices (`client/src/app/store.js`).
- Categories are fixed site structure (`client/src/data/categories.js`), not
  data. Five of them: Cordset · Night suits · Bras · Panties · Kids. Each
  carries a `sizes` array (apparel = XS–XL, Kids = 8–16) — the single source
  for the admin form's size toggles and the filter. A category with no `span`
  (Kids) is shown in the menu/shop but is NOT a homepage gallery tile.
- **Category is navigation, not a filter.** `/shop?category=<id>` (set by the
  menu + category tiles) scopes the shop; an unknown value shows everything.
  The filter panel handles size / price / sort — plus a boy/girl `gender`
  filter shown ONLY when browsing `kids` (gated by category in `ShopPage`).
- The announcement bar is **home page only** (`<Header announcement />`).
  `Header` props: `solid` (force the solid state), `border`, `announcement`,
  `surface` (`'canvas'` default · `'white'` for the product page) — each page
  composes what it needs.
- **Footer**: the full `Footer` (dark, link columns + socials) appears **only
  on the landing page**. Inner pages have no footer — they just end. Legal
  pages stay reachable site-wide through the menu instead: `MenuOverlay`'s
  secondary links include Privacy / Terms / Refund.

## Roles

- `user` → `/account` — Purchases · Favourites · My details (horizontal tabs;
  uses the standard storefront `Header`, like every other page). The Purchases
  tab lists orders newest-first as date-anchored cards; clicking any product
  thumbnail expands `OrderDetailPanel` — on a wide screen, absolutely
  positioned beside that order's images, pinned at the top and sized to its
  content (shorter than the images), so opening it never grows the card or
  shifts the orders below; stacks below the images on a narrow screen. Shows
  order no., dates, return deadline, and Invoice + Track buttons (both are
  placeholders — invoice generation and order tracking not yet built).
- `admin` → `/admin` — dashboard hub: "Manage products" · "Configure landing page"
  (admins hitting `/account` are redirected to `/admin`)

## Built so far

Landing page · auth (login / signup) · account area · admin panel (product CRUD
with Cloudinary image uploads, variant model) · single product page
(`/product/:id`) with colour/size selection + add-to-cart.

Content pages: `/about` (the brand story — Sonari is a curated multi-brand
store, NOT a manufacturer) and `/contact` (a front-end-only message form +
contact details). Linked from the Footer and the menu's secondary links.
Store email/phone/address are the `CONTACT` const at the top of
`ContactPage.jsx`.

Legal pages share `components/layout/PolicyLayout.jsx` — pass `title`,
`updated`, `intro`, `sections` (array of `{ heading, body }`; `body` items are
strings or `{ list: [...] }`). All three are built — `/privacy`, `/terms`, `/refund`. Legal links live in the
Footer's `LEGAL` array. Refund policy specifics: 10-day return window,
restocking fee = the courier's return-shipping charge, returns inspected before
refund, damaged/incorrect claims require an unboxing video, intimates
non-returnable for hygiene unless faulty.

Cart page (`/cart`) — two columns: a grid of small item cards on the left
(scrolls within itself past ~2 rows) and a checkout summary panel on the right
(total + free-delivery progress + not-yet-wired Checkout button). Thumbnails use
each product's live cover (`getProduct` lookup), not the stored snapshot image.
The Header bag icon links here; it's the only cart UI (the `/account` area no
longer has a Cart tab).

Shop browsing page (`/shop`) — full-width product grid, category scoped by the
URL. Filtering uses a chat-widget-style dock pinned bottom-right: a pill
launcher with a panel that expands above it — no backdrop, no scroll lock, the
grid stays live as you filter. See `client/src/components/shop/FilterPanel.jsx`.

`/shop` uses **server-side pagination + infinite scroll** (the catalogue is
expected to reach tens of thousands of products):
- `GET /api/products` is paginated and does ALL filtering/sorting in Mongo.
  Params: `page` · `limit` (max 60) · `category` · `tag` · `sizes` (CSV) ·
  `priceMin` / `priceMax` · `sort` (`newest` | `price-asc` | `price-desc`).
  Responds `{ products, page, totalPages, total, hasMore }`.
- `client/src/services/productApi.js` → `listProducts(params)` returns the
  **whole envelope** (not just `.products`) — callers need `total` / `hasMore`.
- `ShopPage` refetches page 1 whenever category/filters/sort change, and an
  IntersectionObserver sentinel appends later pages. A `reqId` ref discards
  responses from a superseded query.
- `AdminProductsPage` uses the same endpoint — category tabs, a debounced
  name search (server `?search=`), and a "Load more" button.
- Skip/limit pagination is fine here; switch to cursor-based only if very deep
  scrolling becomes common.

The `cart` slice is fully working — a cart line is keyed by product + colour +
size (`lineId`); see `client/src/features/cart/cartSlice.js`.

**Cart persistence.** The Redux `cart` slice is the live source the UI reads;
a listener middleware (`features/cart/cartListener.js`, prepended in
`app/store.js`) mirrors it to the right store:
- **Signed out** → localStorage (`cartStorage.js`), so the bag survives refresh.
- **Signed in** → the DB (`Cart` model, one doc per user). `GET/PUT /api/cart`
  + `POST /api/cart/merge`, all behind `protect`. `PUT` replaces the cart
  wholesale (debounced 450ms); the controller stores item *snapshots*, so
  checkout must re-validate price/stock against the live Product.
- **On sign-in** (loadUser/login/register fulfilled) the guest bag is merged
  into the DB cart and localStorage cleared. **On logout** Redux + localStorage
  are emptied; the DB cart stays for next time.

## Checkout & payments

`/checkout` (RequireAuth) — address form + order summary + Razorpay payment.
- **Razorpay keys** switch by `NODE_ENV` (`server/src/config/razorpay.js`):
  production → `RAZORPAY_PROD_*`, else → `RAZORPAY_DEV_*`. No code change to
  go live — set `NODE_ENV=production` and the prod keys.
- **Order model** (`server/src/models/Order.js`) — item snapshots, shipping
  address, server-computed `subtotal`/`deliveryFee`/`total`, `razorpayOrderId`,
  `paymentStatus` (`created`→`paid`/`failed`), `status` (`placed`…), and
  `returnDeadline` — frozen at order creation as `createdAt + RETURN_WINDOW_DAYS`
  (10, from the Refund policy; the constant lives in `orderController.js`).
- Flow: `POST /api/orders/create` builds a pending Order + a Razorpay order
  (totals computed server-side from the DB cart — client totals never trusted)
  → client opens Razorpay → `POST /api/orders/verify` checks the HMAC
  signature, marks the order paid, empties the cart, and **decrements variant
  stock** → `/order/confirmed`.
- On payment success, `reduceStockForOrder` lowers `colors[].sizes[].stock` for
  each ordered variant. It runs in BOTH verify and the webhook, but the
  `paymentStatus !== 'paid'` idempotency guard means it fires exactly once per
  order. (Stock is not *reserved* at order-creation, so a race in the payment
  window can still oversell by a little — reservation is a future upgrade.)
- Delivery: free at/above ₹2,000, else **₹120** — `data/shipping.js` on the
  client, re-declared in `orderController.js` on the server (keep in sync).
- `GET /api/orders` backs the account "Purchases" tab.
- **Saved addresses** — `User.addresses[]` (each with its own `_id`).
  Checkout shows a scrollable picker of saved addresses *or* a new-address
  form with a "Save this address" checkbox; ticking it makes `createOrder`
  store the address on the user. `DELETE /api/users/addresses/:id` removes
  one. The account "My details" tab lists and removes them. Redux syncs via
  the `setAddresses` auth reducer.
- `POST /api/orders/webhook` — Razorpay's server-to-server callback, the
  reliable confirmation path if the browser-side verify is lost. Signature-
  verified against the RAW body (`index.js` keeps it on `req.rawBody` via the
  `express.json` `verify` hook); mounted before `protect` since it has no
  session. Secret: `RAZORPAY_DEV/PROD_WEBHOOK_SECRET`. Idempotent with verify.
- Not yet done: order-confirmation emails.
- **Fulfilment rule:** orders exist in the DB from `/orders/create` onward with
  `status: 'placed'` *before* payment. NEVER fulfil/ship on `status` — only on
  `paymentStatus === 'paid'`.
- Auto-capture is **ON** in the Razorpay dashboard, so a `paid` order means
  money was actually captured (not merely authorised).

## Next steps

The full backlog of refinements lives in **`UPGRADES.md`** (project root) —
stock reservation, admin order management, refund processing, emails, wishlist,
the legal review, the go-live checklist, etc. Check it before starting new work
so nothing is rebuilt or missed.

Nearest-term, both detailed in `UPGRADES.md`:
- **Admin order management** — a list of PAID orders with a per-order
  verification check; the owner has specific verification logic, so **ask
  before building**.
- The admin "Configure landing page" tool (`/admin/landing` is a stub).
