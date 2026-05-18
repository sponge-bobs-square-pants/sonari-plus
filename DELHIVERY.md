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

**Exception:** the **tracking API** (§3.7) is always served from
`track.delhivery.com`, even for staging — the `staging-express` host `401`s
on it (its tracking path is gated behind the web-portal session).

**Token.** A unique 12–16 char API token per account. Delhivery issues a
**sandbox token** for testing, then a **production token** after UAT —
confirm which one you hold. Stored in `server/.env` as `DELHIVERY_API_TOKEN`.
Planned config `server/src/config/delhivery.js` picks the base URL by
`NODE_ENV`, mirroring `server/src/config/razorpay.js`.

**Auth header** on every request: `Authorization: Token <DELHIVERY_API_TOKEN>`

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

### 3.6 Pickup Request
`POST /fm/request/new/` — fields: `pickup_time`, `pickup_date`,
`pickup_location` (warehouse name), `expected_package_count`. Returns a
`pickup_id`. One warehouse can't queue a second pickup until the first
completes; different warehouses are independent. Can also be done in the
portal.

### 3.7 Order Tracking — **this is what nuit builds**
`GET https://track.delhivery.com/api/v1/packages/json/?waybill=<AWB>&ref_ids=<orderRef>`

> ✓ **Verified.** Auth = the `Authorization: Token <token>` header → HTTP
> 200. The tracking API is served from **`track.delhivery.com`** for BOTH
> staging and production — do NOT point it at `staging-express` (that host
> `401`s; its tracking is session-gated, not token-auth).
> A waybill with no data returns:
> `{"Success": false, "Error": "Data does not exists for provided Waybill(s)", "rmk": "…"}`.
> ⚠ A freshly-manifested **staging** waybill was *not* found on
> `track.delhivery.com` — staging shipments may not propagate there. To get
> a FULL-data sample (the `ShipmentData` + `Scans` structure below), use a
> waybill that has real scan history — ask Delhivery for a test waybill, or
> use the first real production shipment.

- **Pull** (what we use) — GET on demand. **Rate limit: 750 req / 5 min /
  IP** — cache, never poll per page view.
- **Push** — Delhivery `POST`s every scan to a webhook we host. Needs the
  endpoint URL + 1–2 live waybills + a sample curl given to Delhivery; ~5–6
  working days for them to enable. A possible later upgrade — not built.

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
> ⚠ Delhivery's portal renders the field schema only inside a JS app that
> can't be captured here. The shape above is the well-known Delhivery
> response — **verify exact field names against a real staging response**
> when wiring this up, and correct this file.

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

- **Only the Tracking API (Pull)** — §3.7. Backend proxies the call (token
  stays server-side), the customer tracking UI renders `Scans` as a
  timeline with the current `Status` as the headline.
- **Our order `status` is admin-set, not synced from Delhivery.** The admin
  marks `dispatched` / `delivered` / `failed-delivery` by hand (see
  `AdminOrdersPage` → `FulfilmentSection`). The Delhivery feed is
  display-only. Auto-sync via the Push webhook (§3.7) is a future upgrade.
- Steps 1–6 are **not** in the app — the owner books shipments in the
  Delhivery portal and types the courier + AWB into the admin panel.

---

## 6. Testing

To test tracking you need a waybill that exists in Delhivery **staging**:
1. Confirm you hold the **sandbox token**; use the `staging-express` base URL.
2. Easiest — create a **test shipment in the Delhivery staging portal** by
   hand to mint a trackable test AWB. (No code; we don't need to build
   Steps 2–6.)
3. Alternatively run the pipeline against staging: warehouse → waybill →
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
