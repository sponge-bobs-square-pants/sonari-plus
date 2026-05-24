# Delhivery — courier integration

Reference for **nuit**'s Delhivery integration. Documents the **full B2C
pipeline** so the whole picture is clear — but note the scope:

> **What nuit actually builds:** only **Step 7, tracking** (read-only). The
> owner books shipments through Delhivery's own portal; Steps 1–6 below are
> documented for understanding and for creating **test waybills** in
> staging. We do not write shipment-creation code in the app.

---

## 1. Environments & auth

The **same paths** are used for staging and production — only the base URL
changes:

| Environment       | Base URL                                |
| ----------------- | ---------------------------------------- |
| Staging / testing | `https://staging-express.delhivery.com`  |
| Production        | `https://track.delhivery.com`            |

The **tracking API** (§3.7) uses this **same base URL** — it works on
`staging-express` in dev with the token. (It `401`'d in earlier tests only
because of an old, wrong token.)

**Token.** Delhivery issues a **sandbox/test token** and (after UAT) a
**production token** — separate credentials. `server/.env` holds:
- `DELHIVERY_DEV_API_KEY` — staging/test token. ✓ Verified working across
  **waybill, order creation, warehouse AND pickup** on one account.
- `DELHIVERY_PROD_API_KEY` — production token (add at go-live).
- `DELHIVERY_CLIENT_ID` — the account's client name for the `cl` param.
  Staging test account = `KRISHNASURFACE-B2C`.

Planned config `server/src/config/delhivery.js` picks the token + base URL
by `NODE_ENV`, mirroring `server/src/config/razorpay.js`. (An earlier
`{"detail":"Invalid token"}` on pickup was an *old, wrong* key — the proper
dev token works for all these services; pickup does NOT need its own token.)

**Auth header** on every request: `Authorization: Token <token>`

---

## 2. The pipeline — 7 steps of integration

A shipment's full life, end to end. nuit only implements step 7; the rest
is the owner's job (via the portal) but is needed to mint test waybills.

| # | Step | API | Who does it for nuit |
|---|------|-----|----------------------|
| 1 | Check pincode is serviceable | Pincode Serviceability | (optional) |
| 2 | Register the pickup location | Warehouse Creation | owner / portal |
| 3 | Get a waybill (AWB) number | Bulk Waybill | owner / auto |
| 4 | Create the order (manifest it) | Order Creation | owner / portal |
| 5 | Generate the shipping label | Packing Slip | owner / portal |
| 6 | Schedule the pickup | Pickup Request | owner / portal |
| 7 | **Track the shipment** | **Order Tracking** | **nuit (this app)** |

Plus, off the main line: **Edit Order**, **Cancel Order**, and the **NDR**
(non-delivery report) API for rescheduling undelivered parcels.

---

## 3. API reference

All paths below are appended to the environment base URL from §1.

### 3.1 Pincode Serviceability
`GET /c/api/pin-codes/json/?token=<token>&filter_codes=<pincode>`
Tells you whether Delhivery delivers to a pincode, and whether **prepaid**
and **COD** are supported there. An `NSZ` response = non-serviceable zone.

### 3.2 Warehouse Creation ✓ verified on staging
`POST /api/backend/clientwarehouse/create/`
Registers a physical pickup location ("warehouse"). Order Creation's
`pickup_location` references it **by `name`** (case-sensitive). Edit via
`/api/backend/clientwarehouse/edit/`.

Our staging test warehouse: **name `Sonari Nightwear`**, Vadodara, pincode
390006. The success response echoes the warehouse under `data` with
`success: true` and `message: "A new client warehouse has been created…"`.

### 3.3 Waybill — fetch a number ✓ verified on staging
Two `GET` endpoints, both require `cl`:
- **Single** — `/waybill/api/fetch/json/?cl=<cl>`
- **Bulk** — `/waybill/api/bulk/json/?cl=<cl>&count=<n>` (≤10,000 per
  request, ≤50,000 / 5 min, else a 1-minute IP throttle)

`cl` = the account's client identifier — **required**. Without it the API
returns `400 "Unable to fetch client name for the token"`; it is NOT
derivable from the token. Stored in `server/.env` as `DELHIVERY_CLIENT_ID`.
Auth: the `Authorization: Token <token>` header.

A **waybill (AWB)** is the unique number for a shipment in Delhivery's
network. It is only a *reserved number* — not trackable until it is used in
Order Creation (§3.4).

**Response** — the waybill as a bare JSON string:
```json
"6699010000766"
```
For `count > 1`, a comma-separated list inside the string.

### 3.4 Order Creation / Manifestation
`POST /api/cmu/create.json` — **manifestation** = registering the order so
the waybill becomes a real, trackable shipment.

Request (verified format):
- Headers: `Authorization: Token <token>`,
  `Content-Type: application/x-www-form-urlencoded`
- Body: `format=json` + `data=<URL-encoded JSON>`, where the JSON is:
  ```jsonc
  {
    "pickup_location": { "name": "Sonari Nightwear" },   // warehouse name
    "shipments": [{
      "waybill": "6699010000766",      // optional single-piece
      "order": "<unique order id>",
      "payment_mode": "Prepaid",        // Prepaid / COD / Pickup
      "name": "...", "add": "...", "pin": "...",
      "city": "...", "state": "...", "country": "India",
      "phone": "...",
      "products_desc": "...", "total_amount": "...", "quantity": "1",
      "weight": "400",
      "seller_gst_tin": "...", "hsn_code": "..."
    }]
  }
  ```

> ✓ **Verified on staging.** Returns `success: true` with a `packages[]`
> array — each entry has `waybill`, `status: "Success"`, `payment`,
> `refnum`, `serviceable`; plus a top-level `upload_wbn` batch id.
>
> **Gotcha — the `end_date` crash.** If `pickup_location.name` does not
> EXACTLY match a registered, fully-provisioned warehouse, Delhivery's rate
> lookup returns `None` and the server crashes — HTTP 200 but
> `success: false` and `'NoneType' object has no attribute 'end_date'`.
> The warehouse name is case- and spacing-sensitive: our working warehouse
> is **`SONARI NIGHT WEAR`** (not "Sonari Nightwear"). Pass the full
> `pickup_location` — name + add + city + pin_code + country + phone. This is a **staging-account
> provisioning gap** (no rate-card / serviceability record for the
> account). **Action:** report it to Delhivery (`tech.admin@delhivery.com`
> / the account manager), quote the error verbatim, and give the client id
> `89c155-KRISHNASERVICES-do-cdp`. Until Delhivery fixes it, no test
> shipment can be manifested — so the tracking API (§3.7) cannot be
> exercised yet either. The tracking endpoint also returned `401` in
> testing; revisit once a package exists (it may be the same provisioning
> gap, or the token needs a different param — verify then).

### 3.5 Packing Slip
`GET` the Packing Slip API → label data (all shipment details for the
printed label). Owner-side; not used by nuit.

### 3.6 Pickup Request ✓ verified on staging
`POST /fm/request/new/` — JSON body (`Content-Type: application/json`):
- `pickup_time` — `HH:MM:SS`
- `pickup_date` — `YYYY-MM-DD`; must be **today or future** (a past date →
  `400 {"pickup_date":"Pickup date cannot be in past"}`)
- `pickup_location` — the warehouse **name**; must match a registered
  warehouse on this account (else `400 "Invalid Pickup Location…"`)
- `expected_package_count` — integer

**Response** (HTTP 201) — store `pickup_id` to reference the pickup:
```json
{
  "pickup_id": 125822,
  "client_name": "KRISHNASURFACE-B2C",
  "pickup_location_name": "SONARI NIGHT WEAR",
  "incoming_center_name": "Vadodara_Karelibaug_DC",
  "pickup_time": "14:00:00",
  "pickup_date": "2026-05-26",
  "expected_package_count": 1
}
```
A pickup is **per-warehouse**, not per-order (one pickup sweeps all that
warehouse's manifested parcels).

### 3.7 Order Tracking — **this is what nuit builds** ✓ verified, full data
`GET {baseUrl}/api/v1/packages/json/?waybill=<AWB>&ref_ids=<orderRef>`

> ✓ **Verified with full data.** Same base URL as the other APIs
> (`staging-express` in dev, `track.delhivery.com` in prod) + the
> `Authorization: Token <token>` header. Look up by `waybill` OR `ref_ids`
> (the order id). A waybill with no data returns
> `{"Success": false, "Error": "Data does not exists for provided Waybill(s)"}`.
> (The earlier "only track.delhivery.com / staging 401s" finding was an
> *old, wrong* token — the proper dev token works on `staging-express`.)

- **Pull** — GET on demand. **Rate limit: 750 req / 5 min / IP** — cache,
  never poll per page view. (Used only ad-hoc; the webhook is our live feed.)
- **Push (BUILT)** — Delhivery `POST`s every scan to our webhook. See §3.7a.

Response shape (verify field names against a real staging response):
```jsonc
{
  "ShipmentData": [{
    "Shipment": {
      "AWB": "<waybill>",
      "ReferenceNo": "<order ref>",
      "Origin": "...", "Destination": "...",
      "PickedupDate": "...", "DeliveryDate": "...",
      "Status": {
        "Status": "In Transit",        // human-readable
        "StatusType": "UD",            // type code — see §4
        "StatusDateTime": "2026-05-18T14:30:00",
        "StatusLocation": "Vadodara_Hub (Gujarat)",
        "Instructions": "..."
      },
      "Scans": [{
        "ScanDetail": {
          "Scan": "In Transit", "ScanType": "UD",
          "ScanDateTime": "...", "ScannedLocation": "...",
          "StatusCode": "...", "Instructions": "..."
        }
      }]
    }
  }]
}
```
> ✓ These field names are confirmed against the **live staging response**.
> Real values seen: `Status.Status` = "Manifested", `Scans[].ScanDetail`
> with `Scan` / `ScanType` (UD) / `ScanDateTime` / `ScannedLocation` /
> `StatusCode` (e.g. "X-UCI") / `Instructions`. Also present on `Shipment`:
> `Consignee {Name,City,PinCode}`, `OrderType`, `InvoiceAmount`,
> `Origin`, `Destination`, `PickedupDate`, `DeliveryDate`.

### 3.7a Scan Push Webhook — **BUILT** (our live tracking feed)
Delhivery `POST`s every scan, in real time, to
`POST /api/orders/delhivery-webhook` (`delhiveryWebhook` in
`orderController.js`, mounted before `protect`). This is how an order becomes
**delivered** automatically.

- **Setup is NOT self-serve.** Fill the **Scan Push Webhook Requirement
  Document** (dev + prod account name, endpoint URL, auth header key/value)
  and email it to **lastmile-integration@delhivery.com** (cc your business
  POC). Delhivery's tech team tests it, then enables it. Scan Push and
  Document (POD) Push are **separate** webhooks.
- **Auth:** a header key/value WE choose, declared in the doc. We use
  `x-delhivery-token: <DELHIVERY_*_WEBHOOK_TOKEN>` and the handler rejects any
  POST whose header doesn't match. (Optionally also whitelist Delhivery's
  source IPs at nginx/firewall — listed in `server/.env.example`.)
- **≤500ms response budget.** If our endpoint is slower, Delhivery times out
  and **drops the scan**. So the handler does just one indexed lookup
  (`trackingId` is indexed) + save, and replies `200`. Idempotent: scans are
  deduped on `statusType+status+scannedAt`, status flips are guarded — so a
  re-pushed/retried scan is a no-op.
- **Payload** (default): `{ Shipment: { Status: { Status, StatusType,
  StatusDateTime, StatusLocation, Instructions }, NSLCode, ReferenceNo, AWB } }`.
  We match the order by `AWB` (= `trackingId`), falling back to `ReferenceNo`
  (= our order `_id`). Every scan is appended to `order.trackingScans[]`.
- **Status mapping — the `DL` gotcha.** `StatusType` is a family code; the
  forward-shipment ones are `UD` (Manifested / Not Picked / In Transit /
  Pending / Dispatched) and `DL`. **`DL` is BOTH `Delivered` AND `RTO`** — so
  we branch on `Status`, never the type:
  - `DL` + `Delivered` → order `delivered`, `returnDeadline` = the scan's real
    delivery date + 10 days.
  - `DL` + `RTO` → order `failed-delivery`.
  - everything else → stored as a timeline scan only (no status change).

### 3.8 Edit / Cancel Order
- Edit: `POST /api/p/edit`
- Cancel: `POST /api/p/edit` with `"cancellation": "true"` in the JSON body.
Cancellation is allowed only while the package is **Manifested, In Transit,
Pending, Open or Scheduled**. After cancelling: prepaid/COD → `Returned`,
pickup → `Cancelled`.

### 3.9 NDR — Non-Delivery Report
`POST` the Asynchronous NDR Package Action API to act on undelivered
parcels (reschedule, update address, etc.). Owner-side.

---

## 4. Package lifecycle & statuses

**`StatusType`** — the coarse type code:

| Code | Meaning                                                  |
| ---- | -------------------------------------------------------- |
| UD   | Undelivered — in the forward journey, not yet delivered  |
| DL   | Delivered — forward shipment delivered (end state)       |
| RT   | Returned — shipment returned to origin (RTO)             |
| PP   | Pickup Pending — reverse pickup (RVP) awaiting pickup    |
| PU   | Picked Up — RVP shipment picked up                       |
| CN   | Cancelled — RVP cancelled                                |

**`Status`** — the finer human-readable value:
- **In motion:** Manifested → Pending → Scheduled → In Transit → Dispatched
  (Open is a pre-transit state)
- **Terminal:** Delivered · Cancelled · RTO (Return to Origin) ·
  DTO (Deliver to Origin) · Collected

**Forward-journey workflow** (the only path that matters for nuit):

```
Manifested → In Transit → Dispatched → Delivered        (StatusType DL)
                                    ↘ (3 failed attempts)
                                      RTO / Returned     (StatusType RT)
```

Reverse pickups (RVP) run PP → PU → … and aren't relevant unless we add
returns pickup later.

---

## 5. What nuit implements

The shipping pipeline runs **inside the admin panel** — the owner never
touches the Delhivery portal. Code: `server/src/config/delhivery.js`
(env-switched config + auth header), `server/src/services/delhivery.js` (the
API calls), `orderController.js` (the endpoints), `AdminOrdersPage` /
`AdminPickupsPage` (the UI).

- **Manifest (Order Creation, §3.4)** — `POST /api/orders/admin/:id/manifest`
  `{ weight, dimensions }` → `createShipment` mints a waybill and registers
  the shipment. Order goes `accepted → manifested`, storing
  `courier:'delhivery'` + `trackingId` (the waybill). The
  `pickup_location.name` MUST exactly match a registered warehouse name (the
  `end_date` gotcha — see §3.4).
- **Batch Pickup (§3.6)** — `POST /api/orders/admin/pickup`
  `{ orderIds, pickupDate, pickupTime }` → `schedulePickup` with
  `count = orderIds.length`. Booked orders go `manifested → dispatched` and
  store `pickupId`. The Pickups panel (`/admin/pickups`) lists manifested
  orders for batch selection — one pickup collects them all.
- **Packing Slip / label (§3.5)** — `GET /api/orders/admin/:id/label` →
  `getPackingSlip` returns the PDF link; "Print label" opens it.
- **Scan Push webhook (§3.7a) — BUILT.** Delhivery POSTs every scan to
  `POST /api/orders/delhivery-webhook`; scans are stored on
  `order.trackingScans[]`, and a `DL`/`Delivered` scan flips the order to
  `delivered` (stamping `returnDeadline` from the real delivery date),
  `DL`/`RTO` → `failed-delivery`. Goes live once Delhivery enables the webhook
  for our endpoint (requires the public URL + their requirement-doc process).
- **Tracking (Pull, §3.7)** — kept for ad-hoc lookups; the webhook is the
  live feed. Customer-facing, the decision is to show our own status ("On its
  way") plus a link out to Delhivery's tracking page, rather than render the
  full scan timeline in-app (revisitable now that scans are stored).
- **Order `status` is admin-driven UP TO `dispatched`, then webhook-driven.**
  Admin actions set `placed → accepted → manifested → dispatched`; the
  webhook sets `delivered` / `failed-delivery` automatically. A manual
  "Mark delivered" button remains as a fallback/override until the webhook is
  live in production.
- **Delhivery is the only shipping path** — there is no manual-courier
  fallback. Every paid+accepted order ships via the manifest → pickup flow.

---

## 6. Testing

To test tracking you need a waybill that exists in Delhivery **staging**:
1. Confirm you hold the **sandbox token**; use the `staging-express` base URL.
2. Easiest — manifest a paid+accepted test order through the admin panel
   (or run the service directly) to mint a trackable test AWB.
3. Or run the pipeline against staging by hand: warehouse → waybill →
   order creation → get the AWB.
4. Track that AWB through our endpoint against staging.
5. Go-live: `NODE_ENV=production` switches the base URL — no other change.

---

## 7. Official docs

- Developer portal — https://one.delhivery.com/developer-portal/documents/b2c/
- Readable mirror (used for this doc) — https://delhivery-express-api-doc.readme.io/
- 7 steps of integration — https://delhivery-express-api-doc.readme.io/reference/7-steps-of-integration
- Package lifecycle — https://delhivery-express-api-doc.readme.io/reference/package-lifecycle-1
- Order tracking — https://delhivery-express-api-doc.readme.io/reference/order-tracking-api
