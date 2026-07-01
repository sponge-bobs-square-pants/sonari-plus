# nuit

A MERN e-commerce store for women's nightwear & intimates (the owner's family
business). `client/` — Vite + React frontend · `server/` — Express + MongoDB API.

The consumer brand is **nuit**; the GST-registered legal entity is **Ashok
Chawla HUF**, trade name **Sonari Night Wear**.

This file is a **map**, not a copy — it points to the files where decisions live
so they never go stale. Read the referenced files for detail.

## Running it

- **Server**: `cd server && npm run dev` → http://localhost:5174
  (NOT 5000 — macOS AirPlay Receiver occupies port 5000)
- **Client**: `cd client && npm run dev` → http://localhost:5173
- After editing `server/.env`, **restart the server** — nodemon doesn't watch `.env`.
- First admin account: `cd server && npm run seed:admin`
- Env templates: `server/.env.example`, `client/.env.example`.

## Deployment

Live on a **DigitalOcean droplet** (`143.110.184.135`, Ubuntu, 1GB). Domains
(GoDaddy DNS): **www.nuit.in** (frontend; apex `nuit.in` 301s → www) and
**backend.nuit.in** (API). MongoDB is **Atlas** (droplet IP allowlisted).

- **Each app ships via its own `Dockerfile` + `Makefile`** (`client/`,
  `server/`) on the Docker Hub flow: `make build-deploy` = build `linux/amd64`
  (the Mac is arm64) → push to `nuitdotin/<img>` → SSH the droplet, pull, run.
  Bump `TAG`/`OLD_TAG` per release. Build LOCALLY (the 1GB droplet can't).
- **Containers bind to `127.0.0.1`** (backend `:5174`, frontend `:8080`); the
  **host nginx** (apt-installed, not containerized) reverse-proxies the domains
  to them, with **certbot** TLS (auto-renewing; verified). vhosts in
  `/etc/nginx/sites-available/`.
- **Backend env** lives in `/root/Nuit/backend/.env` ON THE DROPLET, passed via
  `--env-file`. ⚠️ `--env-file` is read at `docker run`, NOT on `docker restart`
  or file-edit — you must **recreate the container** (`make deploy`) for env
  changes to apply.
- **Frontend has no runtime env** — `VITE_API_URL` (`https://backend.nuit.in/api`)
  is baked at build time by the Makefile build-arg; changing it needs a rebuild.
- **Deploy order: backend first, then frontend** — the frontend's invoice links
  call backend routes that must exist first.
- `NODE_ENV=production` switches Razorpay AND PhonePe to prod keys.
  Delhivery uses its OWN `DELHIVERY_MODE` env var (independent of
  NODE_ENV) so shipping can be pinned to staging while payments are
  live — set `DELHIVERY_MODE=production` only when the live Delhivery
  account (waybills, pickup warehouse, KYC) is fully set up.

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
  fill the viewport as **full-bleed `min-h-screen` sections** that snap to the
  very top — each pads its OWN content down by `var(--header-height)` so it
  clears the fixed navbar. (Full-bleed on purpose: the navbar then only ever
  overlays *that section's own* background, so no neighbouring section can
  leak a seam under it.) The bottom three — ValueProps, Newsletter and the
  Footer — are merged into one full-height **closing screen** (a `<section>`
  in `LandingPage`, their padding compacted to fit) so they snap as a single
  page. The landing page **scroll-snaps** (desktop only, ≥1024px):
  `LandingPage` toggles a `snap-screens` class on `<html>`
  (`scroll-snap-type: y mandatory`, no scroll-padding); each of the four
  screens — Hero, CategoryGallery, NewArrivals and the closing screen —
  carries `snap-start snap-always`, so on desktop scrolling always lands on
  the next screen with no free scroll. Mobile keeps natural touch scrolling.
  (The old BrandStory "Our story" section was removed — it now lives at `/about`.)

## Conventions

- **Brand name** — never hardcoded. It flows from `client/src/data/brand.js`:
  `BRAND.name` is the consumer brand ("nuit"); `BRAND.legalName` is the
  GST-registered name on policy pages, checkout and the footer copyright.
  They're separate groups so the legal name can switch on its own —
  `legalName` is currently `'Sonari'`, pending the CA's sign-off on the
  rename. The logo is the `Wordmark` SVG (`components/brand/Wordmark.jsx`),
  drawn `fill="currentColor"` so it takes its context's colour. The server
  keeps its own copy of the legal/trade name (for the Bill of Supply) in
  `server/src/config/store.js`.
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
  `sizes` → `{ size, cup, price, discountedPrice, stock }` · `images` · `featuredImage` (a
  dedicated "New this week" cover) · `gender` (`'' | 'boy' | 'girl'` — only set
  for the `kids` category). A variant is identified by `(size, cup)`; `cup` is
  empty for every category EXCEPT bras (where `size` is the band, `cup` the
  cup). `totalStock` is a virtual. `priceFrom` is a **real,
  indexed field** (denormalised from the variant tree) — virtuals can't be
  sorted or range-filtered in Mongo, and `/shop` needs both. Kept in sync by
  `pre('save')` + `pre('findOneAndUpdate')` hooks — never set it by hand.
  Existing rows: `cd server && npm run backfill:price` (one-off).
- **Discounts are per-variant.** `discountedPrice` (optional, must be
  `0 < dp < price` to count) lives next to `price` on each variant —
  matches the existing per-(size, cup) pricing so bras can discount
  a single band×cup if needed. The single source for "what's the customer
  actually charged?" is `effectiveVariantPrice(v)` (server,
  `server/src/models/Product.js`; mirrored client-side as `effectivePrice`
  in `client/src/utils/format.js`). `priceFrom` denormalises the min
  EFFECTIVE price, so discounted products sort and range-filter by what
  the customer would pay (not by MRP). On the money path the order/cart
  item snapshots carry both `price` (charged) AND `mrp` (the un-discounted
  MRP, null when not discounted) — so invoices and order history can
  always show "MRP ₹X" struck through next to what was paid. The admin
  form's bulk-apply prompt (`Apply sale price to all →`) stamps the same
  discount across every variant in a colour; per-variant overrides remain.
- **Image uploads**: `POST /api/upload` (admin only) → Cloudinary. The browser
  never sees the Cloudinary secret — uploads proxy through Express.
- Redux store: `cart` + `auth` slices (`client/src/app/store.js`).
- Categories are fixed site structure (`client/src/data/categories.js`), not
  data. Five of them: Cordset · Night wear · Bras · Panties · Kids. Each
  carries a `sizes` array (apparel = XS–6XL, Kids = 4–16 + 20–34) — the single source
  for the admin form's size toggles and the filter. A category with no `span`
  (Kids) is shown in the menu/shop but is NOT a homepage gallery tile.
- **Bras are TWO-AXIS (band × cup).** The bras category also carries a `cups`
  list (`A–G`); `sizes` is then the band list (`28–44`). Having `cups` is what
  flags a category as two-axis everywhere. A variant gains an optional `cup`
  field (empty for every other category, so their identity stays exactly
  `(colour, size)`); a bra variant's identity is `(colour, band, cup)`. Helpers
  in `categories.js`: `cupsForCategory(id)` and `displaySize({size,cup})` →
  the customer-facing label (`'32B'` for bras, plain `size` otherwise — use it
  anywhere a size is shown: cart, order, invoice). Admin form shows a band×cup
  toggle grid; the product page shows Band then Cup selectors. **Anything
  touching a variant must match on BOTH `size` and `cup`** (stock decrement,
  cart line key, order snapshot) — see `reduceStockForOrder`/`createOrder`.
- **Category is navigation, not a filter.** `/shop?category=<id>` (set by the
  menu + category tiles) scopes the shop; an unknown value shows everything.
  The filter panel handles size / price / sort — plus a boy/girl `gender`
  filter shown ONLY when browsing `kids`, and **Band + Cup** filter groups
  shown ONLY when browsing `bras` (both gated by category in `ShopPage`;
  backend `?cups=` CSV → `colors.sizes.cup $in`).
- The announcement bar is **home page only** (`<Header announcement />`).
  `Header` props: `solid` (force the solid state), `border`, `announcement`,
  `surface` (the solid-state background — `'canvas'` default · `'oat'` ·
  `'white'`). The landing page is borderless (`border={false}`) and **drives
  `surface` dynamically** — an `IntersectionObserver` in `LandingPage` matches
  the navbar's solid colour to whichever `[data-nav-surface]` section is in
  view (Hero stays transparent; CategoryGallery → canvas; NewArrivals and the
  closing screen → oat).
- **Footer**: the full `Footer` (dark, link columns + socials) appears **only
  on the landing page**. Inner pages have no footer — they just end. Legal
  pages stay reachable site-wide through the menu instead: `MenuOverlay`'s
  secondary links include Privacy / Terms / Refund.

## Product URLs

Product pages live at **`/product/<slug>-<24-hex-id>`** (e.g.
`/product/long-cotton-nightdress-68a4f9b2abc1234567890def`). The slug is
derived on the fly from `product.name` — there is no `slug` field in
the DB, so a name edit changes the URL automatically. The 24-hex
ObjectId at the tail is the canonical lookup; anything before it is
SEO decoration.

- **Generate links** with `productPath(obj)` from `client/src/utils/slug.js`.
  Pass a Product, a cart-line snapshot ({productId, name}), or any object
  with `_id` (or `productId`) + `name` — never build the path by hand.
- **Decode** with `productIdFromSlug(slug)` — pulls the trailing 24 hex
  chars. Old bare `/product/<id>` URLs still resolve because the regex
  matches the whole string as the ID, so bookmarks and old shared links
  keep working.
- **Canonical redirect**: `ProductPage` calls
  `navigate(productPath(p), { replace: true })` after load if the URL
  isn't already the canonical form. Search engines consolidate signals
  on the slugged form; old bookmarks update their address bar on visit.
- The dynamic sitemap (`server/src/routes/sitemap.js`) and the
  build-time generator (`client/scripts/generate-sitemap.js`) both
  duplicate the `slugify()` rule so they have no client-side import
  dependency. **Three copies — keep them in step**: any rule change
  needs touching `client/src/utils/slug.js`,
  `server/src/routes/sitemap.js`, AND
  `client/scripts/generate-sitemap.js`.

## Page metadata (titles, descriptions, OG cards)

- **Defaults** — `client/index.html`. Brand-level `<title>`,
  `<meta name="description">`, plus a full Open Graph + Twitter Card
  set so any URL pasted into WhatsApp / Facebook / LinkedIn renders as
  a proper "nuit" card instead of a bare link. Update these any time
  the brand tagline changes.
- **Per-page overrides** — `client/src/utils/useDocumentMeta.js`. A
  React hook that updates `<title>` + `description` + the matching OG
  and Twitter content on mount, and restores the previous values on
  unmount. Googlebot executes JS and reads the overridden values, so
  per-page titles flow into Google search results.
- **ProductPage uses it** to publish a product-specific title
  (`{name} — {company} | nuit`) and description (the merchandiser's
  copy trimmed to ~155 chars, falling back to a templated description
  if blank). The OG image is set to the product's cover photo so any
  JS-aware preview also looks product-specific.
- **Still future** — per-product **social card** previews (the
  non-JS Facebook / WhatsApp scraper case) need SSR or prerendering;
  any shared product URL inherits the brand-level OG card until then.

## SEO surfaces

- **`robots.txt`** — `client/public/robots.txt`. Allows the catalogue and
  content pages; disallows private flows (`/account` · `/admin` · `/cart` ·
  `/checkout` · `/order/` · `/verify-email`) so crawl budget goes to
  product/category pages. Points at `https://www.nuit.in/sitemap.xml`.
- **Sitemap (build-time generated)** — `client/scripts/generate-sitemap.js`,
  wired as `postbuild` in `client/package.json`. Runs after `vite build`,
  fetches every product from the production API (`backend.nuit.in/api/products`,
  paginated), and writes a fresh `dist/sitemap.xml` listing all static
  routes + every product as a slugged URL (`/product/<slug>-<id>`).
  Each frontend `make build-deploy` captures the catalogue as of build
  time — new products show up in Google within hours of the next deploy.
  If the API fetch fails (network glitch / backend down), the script
  logs a warning and leaves the **`client/public/sitemap.xml`** static
  fallback in place — Vite copied it to `dist/` earlier in the build,
  so the image still ships with a valid (marketing-only) sitemap. Keep
  `public/sitemap.xml` around for that reason.
- **Dynamic sitemap (server)** — `server/src/routes/sitemap.js`,
  mounted at the ROOT of the backend (not `/api/*` — Google fetches
  "well-known" paths). Lists the same routes + products, fresh on
  every request, cached 5 min. Reach it at
  `https://backend.nuit.in/sitemap.xml`. This is the **real-time**
  upgrade: when frontend deploys aren't frequent enough to pick up new
  products, add this `location` block to the `www.nuit.in` host nginx
  vhost (BEFORE the catch-all `/`) and `systemctl reload nginx` —
  `www.nuit.in/sitemap.xml` then serves the live backend version and
  the postbuild's snapshot becomes a fallback-of-a-fallback:

  ```
  location = /sitemap.xml {
      proxy_pass http://127.0.0.1:5174/sitemap.xml;
      proxy_set_header Host $host;
  }
  ```

  With that proxy in place, the dynamic version wins over the static
  fallback and product URLs flow through automatically. Cached 5 min.
- **Google Search Console** — verify both `www.nuit.in` and
  `backend.nuit.in` (TXT record on `nuit.in` covers both subdomains in
  one shot). Submit `https://www.nuit.in/sitemap.xml`; GSC re-fetches it
  daily so any new product appears in the next crawl.

## Roles

- `user` → `/account` — Purchases · Favourites · My details (horizontal tabs;
  uses the standard storefront `Header`, like every other page). The Purchases
  tab lists orders newest-first as date-anchored cards; clicking any product
  thumbnail expands `OrderDetailPanel` — on a wide screen, absolutely
  positioned beside that order's images, pinned at the top and sized to its
  content (shorter than the images), so opening it never grows the card or
  shifts the orders below; stacks below the images on a narrow screen. Shows
  order no., dates, return deadline, and Invoice + Track buttons.
  **Invoice** links to the order's Bill of Supply PDF once an admin has
  generated it (disabled until then); **Track** is still a placeholder —
  order tracking not yet built.
- `admin` → `/admin` — dashboard hub: "Orders" (`/admin/orders`) · "Bills"
  (`/admin/bills`) · "Manage products" · "Configure landing page" (admins
  hitting `/account` → `/admin`)

## Built so far

Landing page · auth (login / signup) · account area · admin panel (product CRUD
with Cloudinary image uploads, variant model) · single product page
(`/product/:slug` — see "Product URLs" below) with colour/size selection +
add-to-cart.

Content pages: `/about` (the brand story — nuit is a curated multi-brand
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
  name search (server `?search=`), and **infinite scroll** (an
  `IntersectionObserver` sentinel, the same pattern as `/shop`). The admin
  Orders list scrolls infinitely too.
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

`/checkout` (RequireAuth) — address form + order summary + payment.
- **Two providers, env-switched: Razorpay and PhonePe.** `PROVIDER` env
  picks the active one for NEW orders (accepts `RAZORPAY` / `RAZERPAY` /
  `PHONEPE`, defaults to Razorpay). Existing orders carry a `provider`
  field stamped at create-time, so flipping `PROVIDER` mid-day never
  strands an in-flight order — its verify / webhook stays sticky to
  whichever gateway it started on.
- **Provider abstraction** → `server/src/payments/`. Each provider
  (`razorpay.js`, `phonepe.js`) implements the same four-method
  interface: `createCheckout(order)`, `verifyClientCallback(order, body)`,
  `verifyWebhook(req)`, `recheckStatus(order)`. The dispatcher in
  `payments/index.js` exports `getActiveProvider()` (for new orders),
  `getProviderForOrder(order)` (for verify / re-check on existing
  orders), and `getProviderByName(name)` (for the per-provider webhook
  routes). `orderController` never imports a gateway directly.
- **Razorpay keys** switch by `NODE_ENV` (`server/src/config/razorpay.js`):
  production → `RAZORPAY_PROD_*`, else → `RAZORPAY_DEV_*`. JS popup flow,
  HMAC-signed verify callback.
- **PhonePe** (`server/src/config/phonepe.js`) — **PG v2 OAuth**, NOT v1
  salt-key. Env: `PHONEPE_DEV_CLIENT_ID` / `PHONEPE_DEV_SECRET` (+ PROD
  equivalents). Module-scoped token cache refreshes lazily. Webhook auth
  is `Authorization: SHA256(username:password)` matching the pair set in
  the PhonePe portal AND in `PHONEPE_*_WEBHOOK_USERNAME/PASSWORD`. Full-
  page redirect flow (not a popup) → customer lands back on
  `/order/processing` which polls `/verify` until the PhonePe status
  flips COMPLETED (sometimes takes a few seconds post-redirect, so verify
  returns `202 { status: 'pending' }` to signal "try again").
- **Order model** (`server/src/models/Order.js`) — item snapshots, shipping
  address, server-computed `subtotal`/`deliveryFee`/`total`, `provider`
  (`razorpay` | `phonepe`, defaults `razorpay`), `razorpayOrderId` /
  `razorpayPaymentId` (Razorpay orders), `phonepeMerchantOrderId` /
  `phonepeTransactionId` (PhonePe orders),
  `paymentStatus` (`created`→`paid`/`failed`), `status` (`placed → accepted →
  manifested → dispatched → delivered`, plus `cancelled` / `failed-delivery`),
  and `returnDeadline` — the last day a return may be requested; stamped when the
  order is marked **delivered** (delivery date + the 10-day return window),
  null until then. Also `seenByAdmin` (drives the admin "New" badge),
  `verification`
  (`{ status, checkedAt }` — the admin's stored provider re-check result),
  `billOfSupply` (`{ number, url, issuedAt }` — null until generated),
  `courier`/`trackingId` (set when shipped — `trackingId` is the Delhivery
  waybill), `pickupId` (the Delhivery pickup-request id, set when a batch
  pickup is booked), and `trackingScans[]` (Delhivery scans pushed by the
  Scan Push webhook — append-only, deduped; the `DL`/`Delivered` scan flips
  the order to delivered).
- Flow: `POST /api/orders/create` builds a pending Order (provider stamped
  from env) + a provider checkout session (totals computed server-side
  from the DB cart — client totals never trusted) → client receives a
  discriminated payload (`{ provider: 'razorpay', razorpay: {...} }` OR
  `{ provider: 'phonepe', phonepe: { redirectUrl } }`) → Razorpay flow
  opens the popup; PhonePe flow `window.location.assign(redirectUrl)`s →
  `POST /api/orders/verify` dispatches to the order's provider and
  marks paid, empties the cart, **decrements variant stock** →
  `/order/confirmed`.
- On payment success, `reduceStockForOrder` lowers `colors[].sizes[].stock` for
  each ordered variant. It runs in BOTH verify and the webhook, but the
  `paymentStatus !== 'paid'` idempotency guard means it fires exactly once per
  order. (Stock is not *reserved* at order-creation, so a race in the payment
  window can still oversell by a little — reservation is a future upgrade.)
- Delivery: free at/above ₹2,000, else **₹120** — `data/shipping.js` on the
  client, re-declared in `orderController.js` on the server (keep in sync).
- `GET /api/orders` backs the account "Purchases" tab. `GET /api/orders/admin`
  (admin only, paginated, customer name/email joined in, ALL paymentStatuses;
  optional filters `paymentStatus` · `status` · `unseen` · `dateFrom`/`dateTo`
  · `search` — the last-8 order-ID short code, matched via `$toString`+`$regexMatch`)
  backs the admin Orders page — `AdminOrdersPage` at `/admin/orders`, a
  full-bleed two-column master/detail (filterable scrollable list ⟷ detail).
- **Admin order verify check.** Opening an order marks it seen
  (`POST /api/orders/admin/:id/seen` — clears its "New" badge) and runs the
  verify check (`POST /api/orders/admin/:id/verify`) the first time. Verify
  re-confirms the payment STRAIGHT FROM Razorpay (`razorpay.orders.fetch‑
  Payments`) — result is `paid` only on a CAPTURED payment whose amount
  equals the order total, else `failed`/`pending`. It's stored on the order
  (`verification`), shown beside the payment/fulfilment pills with a
  match/mismatch flag against our own `paymentStatus`, and re-runnable via a
  "Re-check" button.
- **GST / Bill of Supply.** The business is GST **composition**-registered,
  so the customer's invoice is a **Bill of Supply** — no tax charged or
  shown; it carries the mandatory composition declaration — NOT a tax
  invoice. Store legal identity → `server/src/config/store.js`. Serial
  numbers come from the `Counter` model (`Counter.next(name)` — atomic,
  gap-free, one sequence per financial year).
  `POST /api/orders/admin/:id/bill` (admin) renders the PDF (`pdfkit`,
  `server/src/utils/billOfSupply.js`), uploads it to Cloudinary as a
  **PRIVATE (`type:'authenticated'`) raw asset**, stores `billOfSupply`
  (`{ number, publicId, url, issuedAt }`) on the order, advances
  `placed → accepted`, and **emails the customer the PDF as an attachment**
  (best-effort — see Email). A Bill of Supply is never re-issued. The PDF
  ("Nocturne" layout — dark night bands framing the page, a crescent moon
  dotting the wordmark) paginates for large orders. Preview it without a live
  order via `cd server && node preview-bill.mjs`.
- **Invoices are PRIVATE — never link the raw Cloudinary URL.** The PDF is an
  authenticated asset (the plain URL 401s), served ONLY through
  `GET /api/orders/:id/invoice` (`getInvoice`, behind `protect`): it checks
  the requester is the order's **owner or an admin**, signs the URL
  server-side, and streams the bytes. The account "Invoice" button and both
  admin views point at this proxy (`${BASE_URL}/orders/:id/invoice`) — this
  closes the old hole where sequential bill URLs were publicly enumerable. The
  admin **Bills** page (`/admin/bills` →
  `GET /api/orders/admin/bills`) is the GST register: every Bill of Supply,
  filterable by issued-date range (3 year presets + custom), with count +
  turnover + 1% composition GST aggregated server-side over the whole range.
- **Order fulfilment** (admin) — Delhivery is the ONLY shipping path (built
  end-to-end; no manual-courier fallback). The lifecycle past `accepted` is a
  **two-step ship**: first *manifest* the parcel (create the Delhivery
  shipment → a waybill), then *book a pickup* that collects all manifested
  parcels at once. Endpoints (each guards `paymentStatus === 'paid'` + the
  required current status):
  - `POST /admin/:id/manifest` (body `{ weight, dimensions }`) — `accepted →
    manifested`. Calls `createShipment` (`services/delhivery.js`), stores
    `courier:'delhivery'` + `trackingId` (waybill). 502 on a Delhivery failure
    (status stays `accepted`). See `DELHIVERY.md`.
  - `GET /admin/manifested` — all `manifested` orders (backs the Pickups panel).
  - `POST /admin/pickup` (body `{ orderIds, pickupDate, pickupTime }`) — books
    ONE Delhivery pickup for `count = orderIds.length` parcels via
    `schedulePickup`, then `updateMany` those orders `manifested → dispatched`
    and stamps `pickupId`.
  - `GET /admin/:id/label` — the Delhivery packing-slip PDF link
    (`getPackingSlip`). The slip's layout is Delhivery's own (any text/barcode
    overlap is their template, not ours — we just open their PDF link).
  - `POST /admin/:id/deliver` (`→ delivered`, stamps `returnDeadline` = now +
    10 days) · `POST /admin/:id/fail-delivery` (`→ failed-delivery`).

  UI: the `AdminOrdersPage` order detail (`FulfilmentSection`) shows a "Ship
  with Delhivery" form (weight + L×W×H → manifest) when `accepted`; a "Ready
  for pickup — schedule in Pickups panel" note when `manifested`; deliver /
  failed-delivery when `dispatched`. A "Print label" button appears once a
  waybill exists. The batch pickup itself lives on a separate page —
  **`/admin/pickups`** (`AdminPickupsPage`, its own dashboard tile): a
  checklist of manifested orders + a date/time picker → one "Schedule pickup".
  Customer-facing, `manifested` reads as **"Preparing to ship"**.
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
- `POST /api/orders/phonepe-webhook` — PhonePe's S2S callback. Same role
  as Razorpay's webhook (the reliable backup if the browser-redirect
  flow is lost), but auth differs: PhonePe sends
  `Authorization: SHA256(username:password)` matching
  `PHONEPE_*_WEBHOOK_USERNAME/PASSWORD`. Both webhooks share
  `handleProviderWebhook` so the idempotent "mark paid + clear cart +
  reduce stock" path is one place.
- `POST /api/orders/delhivery-webhook` — Delhivery's **Scan Push** (built;
  goes live once Delhivery enables it for our prod URL — needs the public
  domain + their requirement-doc process to `lastmile-integration@delhivery.com`).
  Verified by a shared-secret header (`x-delhivery-token` =
  `DELHIVERY_DEV/PROD_WEBHOOK_TOKEN`), mounted before `protect`. Appends each
  scan to `order.trackingScans[]` (deduped) and advances status on terminal
  scans: `DL`/`Delivered` → `delivered` (+ `returnDeadline` from the real
  delivery date), `DL`/`RTO` → `failed-delivery`. **Must reply 200 in <500ms**
  (Delhivery drops the scan otherwise) — so one indexed (`trackingId`) lookup +
  save; idempotent. This is how `delivered` is reached automatically; the admin
  "Mark delivered" button stays as a fallback. Full spec: `DELHIVERY.md` §3.7a.
- **Email (transactional)** → `server/src/utils/mailer.js` (nodemailer over
  SMTP, env `SMTP_HOST/PORT/USER/PASS` + `EMAIL_FROM`, sends as
  `support@nuit.in`). One shared `emailShell({eyebrow, body})` (warm oat card +
  hosted-PNG wordmark logo). Built + LIVE-pending:
  - **Email verification** (soft-gated): signup fires `sendVerificationEmail`
    (best-effort — never blocks signup). Link is a purpose-scoped JWT
    (`signEmailVerifyToken`/`readEmailVerifyToken`, 24h) → `/verify-email`
    page → `POST /api/auth/verify-email` (token IS the proof, no session) flips
    `user.emailVerified`. Resend via `POST /api/auth/resend-verification`
    (protect). A soft banner nudges unverified users; nothing is blocked.
  - **Invoice email**: `sendBillOfSupplyEmail` attaches the PDF (no link —
    invoices are private). Fired best-effort after bill generation.
  - **Link base** for emails: `PUBLIC_SITE_URL` (fall back to first
    `CLIENT_URL`) — `CLIENT_URL` is a CORS list that may start with localhost,
    so never build customer links off it.
  - ⚠️ **DigitalOcean blocks outbound SMTP (25/465/587) by default.** Email
    fails on the droplet (`ECONNREFUSED`/timeout) until either a DO support
    ticket lifts it, OR we switch to an HTTP email API (Resend etc., port 443).
    SMTP creds are correct (verified from a non-droplet host).
- Not yet done: **order-confirmation** emails — fire on the webhook
  confirmation (best-effort, exactly once per order). Tracked in
  `UPGRADES.md` → Order emails. (Blocked on the SMTP situation above.)
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

Nearest-term:
- **Admin order management** — IN PROGRESS. Done: the Orders list +
  two-column detail, filters, New/seen tracking, the Razorpay verify check,
  Bill of Supply generation (→ `accepted`), the **order fulfilment controls**
  (deliver / failed-delivery + manual-courier fallback), and the **Delhivery
  shipping pipeline** — manifest a parcel (→ waybill), the Pickups panel
  (`/admin/pickups`) for batch pickup booking, and packing-slip labels. All
  Delhivery API work is verified end-to-end and specced in **`DELHIVERY.md`**
  (project root). **Next: the customer-facing order-tracking UI** — decided:
  proxied courier tracking, where our backend calls the Delhivery tracking API
  (the verified `getTracking` path) and we render the timeline in-app; the
  account "Track" button is still a placeholder. See `UPGRADES.md` → Admin
  order management. Refund processing follows.
- The admin "Configure landing page" tool (`/admin/landing` is a stub).
