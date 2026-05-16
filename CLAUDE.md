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
- **Full-screen landing sections**: Hero, CategoryGallery, NewArrivals and
  BrandStory each fill the viewport via `min-h-[calc(100vh-var(--header-height))]`
  — the `--header-height` token (`index.css`) subtracts the fixed navbar so a
  section fits the *visible* area. Supporting rows (ValueProps, Newsletter) stay
  natural height — full-screen is for sections with a visual payload, not utility rows.

## Conventions

- Prices: always `formatPrice()` from `client/src/utils/format.js` — INR, "₹ 849".
- India-only shipping; free delivery over ₹2,000 (currently copy in
  `AnnouncementBar`; becomes real logic at checkout — make ₹2,000 a constant then).
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
  "New this week" cover). `totalStock` and `priceFrom` are virtuals.
- **Image uploads**: `POST /api/upload` (admin only) → Cloudinary. The browser
  never sees the Cloudinary secret — uploads proxy through Express.
- Redux store: `cart` + `auth` slices (`client/src/app/store.js`).
- Categories are fixed site structure (`client/src/data/categories.js`), not data.
- **Category is navigation, not a filter.** `/shop?category=<id>` (set by the
  menu + category tiles) scopes the shop; an unknown value shows everything.
  The filter modal handles only size / price / sort.
- The announcement bar is **home page only** (`<Header announcement />`).
  `Header` props: `solid` (force the ink-on-canvas state), `border`,
  `announcement` — each page composes what it needs.

## Roles

- `user` → `/account` — Purchases · Favourites · Cart · My details (tabbed sidebar)
- `admin` → `/admin` — dashboard hub: "Manage products" · "Configure landing page"
  (admins hitting `/account` are redirected to `/admin`)

## Built so far

Landing page · auth (login / signup) · account area · admin panel (product CRUD
with Cloudinary image uploads, variant model) · single product page
(`/product/:id`) with colour/size selection + add-to-cart.

Shop browsing page (`/shop`) — full-width product grid, category scoped by the
URL, and a floating button that opens a filter modal (size / price / sort).
See `client/src/components/shop/FilterModal.jsx`.

The `cart` slice is fully working — a cart line is keyed by product + colour +
size (`lineId`); see `client/src/features/cart/cartSlice.js`.

## Next steps

- Checkout flow (cart → order). The ₹2,000 free-delivery rule applies here —
  make it a named constant when building it.
- The admin "Configure landing page" tool (`/admin/landing` is a stub).
