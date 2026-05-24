import { DELHIVERY, delhiveryAuthHeader } from '../config/delhivery.js'
import { STORE } from '../config/store.js'

// HSN for the shipment label (night wear; innerwear would be 62121000).
// Shipment-level, so a single code — fine for the courier manifest.
const HSN_DEFAULT = '620829'

/**
 * Manifest an order with Delhivery (Order Creation API) — registers the
 * shipment and returns the assigned waybill. The consignee comes from the
 * order; `pkg` carries the physical details Delhivery can't know.
 *
 * Verified request shape: POST /api/cmu/create.json, body
 * `format=json&data=<json>`, `Authorization: Token` header. See DELHIVERY.md §3.4.
 *
 * @param {object} order  Mongoose Order doc (shippingAddress, items, total, _id)
 * @param {{weight:number,length?:number,width?:number,height?:number}} pkg
 * @returns {Promise<{waybill:string,status:string,serviceable:boolean}>}
 */
export async function createShipment(order, pkg) {
  const a = order.shippingAddress
  const data = {
    pickup_location: { name: DELHIVERY.pickupWarehouse },
    shipments: [
      {
        waybill: '', // let Delhivery auto-assign
        order: order._id.toString(),
        payment_mode: 'Prepaid', // every order is Razorpay-prepaid
        name: a.fullName,
        add: a.line1 + (a.line2 ? `, ${a.line2}` : ''),
        pin: a.pincode,
        city: a.city,
        state: a.state,
        country: 'India',
        phone: a.phone,
        products_desc:
          order.items
            .map((i) => i.name)
            .join(', ')
            .slice(0, 100) || 'Nightwear',
        total_amount: String(order.total),
        quantity: String(order.items.reduce((n, i) => n + i.quantity, 0)),
        weight: String(pkg.weight), // grams
        shipment_length: pkg.length ? String(pkg.length) : '',
        shipment_width: pkg.width ? String(pkg.width) : '',
        shipment_height: pkg.height ? String(pkg.height) : '',
        seller_gst_tin: STORE.gstin,
        hsn_code: HSN_DEFAULT,
      },
    ],
  }

  const body = `format=json&data=${encodeURIComponent(JSON.stringify(data))}`
  const res = await fetch(`${DELHIVERY.baseUrl}/api/cmu/create.json`, {
    method: 'POST',
    headers: {
      ...delhiveryAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const json = await res.json().catch(() => null)
  const pkgRes = json?.packages?.[0]
  if (!json?.success || pkgRes?.status !== 'Success' || !pkgRes?.waybill) {
    // Errors come back as a top-level `rmk` or per-package `remarks`.
    const msg =
      json?.rmk ||
      pkgRes?.remarks?.filter(Boolean).join('; ') ||
      'Delhivery could not create the shipment.'
    throw new Error(msg)
  }
  return {
    waybill: pkgRes.waybill,
    status: pkgRes.status,
    serviceable: pkgRes.serviceable,
  }
}

/**
 * Schedule a courier pickup (Pickup Request API) for the warehouse.
 * Verified: POST /fm/request/new/, JSON body. See DELHIVERY.md §3.6.
 *
 * @param {{date:string,time:string,count:number}} opts date YYYY-MM-DD, time HH:MM:SS
 * @returns {Promise<{pickupId:number,date:string,time:string,centerName:string}>}
 */
export async function schedulePickup({ date, time, count }) {
  const res = await fetch(`${DELHIVERY.baseUrl}/fm/request/new/`, {
    method: 'POST',
    headers: {
      ...delhiveryAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pickup_time: time,
      pickup_date: date,
      pickup_location: DELHIVERY.pickupWarehouse,
      expected_package_count: count,
    }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.pickup_id) {
    // Delhivery returns field-keyed error strings, e.g.
    // {"pickup_date":"Pickup date cannot be in past"}.
    const msg =
      json && typeof json === 'object'
        ? Object.values(json).flat().join('; ')
        : 'Delhivery could not schedule the pickup.'
    throw new Error(msg || 'Delhivery could not schedule the pickup.')
  }
  return {
    pickupId: json.pickup_id,
    date: json.pickup_date,
    time: json.pickup_time,
    centerName: json.incoming_center_name,
  }
}

/**
 * Fetch the shipping-label PDF (Packing Slip API) for a manifested waybill.
 * Verified: GET /api/p/packing_slip?wbns=<waybill>&pdf=true → returns a
 * presigned S3 download link (valid ~24h). See DELHIVERY.md §3.5.
 *
 * @param {string} waybill
 * @returns {Promise<string>} the label PDF download URL
 */
export async function getPackingSlip(waybill) {
  const url = `${DELHIVERY.baseUrl}/api/p/packing_slip?wbns=${encodeURIComponent(
    waybill,
  )}&pdf=true`
  const res = await fetch(url, { headers: delhiveryAuthHeader() })
  const json = await res.json().catch(() => null)
  const link = json?.packages?.[0]?.pdf_download_link
  if (!res.ok || !link) {
    throw new Error('Could not fetch the shipping label from Delhivery.')
  }
  return link
}
