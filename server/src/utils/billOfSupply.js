import PDFDocument from 'pdfkit'
import { STORE } from '../config/store.js'

/** Indian financial year for a date — e.g. "2026-27" (FY runs Apr–Mar). */
export function financialYear(date) {
  const y = date.getFullYear()
  const startYear = date.getMonth() >= 3 ? y : y - 1 // April = month index 3
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

// Amounts: Indian digit grouping, two decimals, no currency glyph — the
// standard PDF fonts carry no ₹, so columns are labelled "(INR)" instead.
const amount = (n) =>
  Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const longDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

/**
 * Render an order's Bill of Supply to a PDF buffer. Sonari is a GST
 * COMPOSITION dealer — so this is a Bill of Supply (no tax charged or
 * shown) carrying the mandatory composition declaration, NOT a tax invoice.
 *
 * @param {object} order      a Mongoose Order document
 * @param {string} billNumber the pre-assigned consecutive serial
 * @returns {Promise<Buffer>}
 */
export function buildBillOfSupplyPdf(order, billNumber) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const L = 50 // left edge
    const R = 545 // right edge
    const W = R - L // content width
    const a = order.shippingAddress

    // ── Title + mandatory composition declaration ──
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#000')
      .text('BILL OF SUPPLY', L, 52, { width: W, align: 'center' })
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor('#555')
      .text(STORE.compositionDeclaration, L, 78, { width: W, align: 'center' })

    // ── Seller (left) + bill meta (right) ──
    const top = 108
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#000')
      .text(STORE.tradeName, L, top, { width: 290 })
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#333')
      .text(
        [
          STORE.legalName,
          `GSTIN: ${STORE.gstin}`,
          STORE.address.line1,
          STORE.address.line2,
          `${STORE.address.city}, ${STORE.address.state} ${STORE.address.pincode}`,
        ].join('\n'),
        L,
        top + 19,
        { width: 290 },
      )
    const sellerBottom = doc.y

    const orderRef = `#${order._id.toString().slice(-8).toUpperCase()}`
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#777')
      .text('Bill No.\nBill Date\nOrder Ref.\nOrder Date', 360, top, {
        width: 70,
      })
    doc
      .fillColor('#000')
      .text(
        [
          billNumber,
          longDate(new Date()),
          orderRef,
          longDate(order.createdAt),
        ].join('\n'),
        434,
        top,
        { width: R - 434 },
      )

    // ── Bill to ──
    let y = Math.max(sellerBottom, doc.y) + 22
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('BILL TO', L, y)
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#333')
      .text(
        [
          a.fullName,
          a.line1 + (a.line2 ? `, ${a.line2}` : ''),
          `${a.city}, ${a.state} ${a.pincode}`,
          `Phone: ${a.phone}`,
        ].join('\n'),
        L,
        y + 13,
        { width: 300 },
      )
    y = doc.y + 22

    // ── Items table ──
    const C = { idx: L, desc: L + 28, qty: 330, rate: 395, amt: 470 }
    const row = (cells, ry, bold) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .fillColor(bold ? '#000' : '#333')
      doc.text(cells.idx, C.idx, ry, { width: C.desc - C.idx - 6 })
      doc.text(cells.desc, C.desc, ry, { width: C.qty - C.desc - 10 })
      doc.text(cells.qty, C.qty, ry, {
        width: C.rate - C.qty - 10,
        align: 'right',
      })
      doc.text(cells.rate, C.rate, ry, {
        width: C.amt - C.rate - 10,
        align: 'right',
      })
      doc.text(cells.amt, C.amt, ry, { width: R - C.amt, align: 'right' })
    }

    doc.moveTo(L, y).lineWidth(1).lineTo(R, y).stroke('#000')
    row(
      {
        idx: '#',
        desc: 'Description',
        qty: 'Qty',
        rate: 'Rate',
        amt: 'Amount (INR)',
      },
      y + 7,
      true,
    )
    y += 24
    doc.moveTo(L, y).lineWidth(0.5).lineTo(R, y).stroke('#bbb')
    y += 9

    order.items.forEach((it, i) => {
      const variant = [it.color, it.size].filter(Boolean).join('    ')
      const desc = variant ? `${it.name}\n${variant}` : it.name
      doc.font('Helvetica').fontSize(9)
      const h = doc.heightOfString(desc, { width: C.qty - C.desc - 10 })
      row(
        {
          idx: String(i + 1),
          desc,
          qty: String(it.quantity),
          rate: amount(it.price),
          amt: amount(it.price * it.quantity),
        },
        y,
      )
      y += Math.max(h, 12) + 9
    })

    doc.moveTo(L, y).lineWidth(0.5).lineTo(R, y).stroke('#bbb')
    y += 12

    // ── Totals ──
    const totalLine = (label, value, bold) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 10 : 9)
        .fillColor('#000')
      doc.text(label, 330, y, { width: C.amt - 330 - 10, align: 'right' })
      doc.text(value, C.amt, y, { width: R - C.amt, align: 'right' })
      y += bold ? 20 : 16
    }
    totalLine('Subtotal', amount(order.subtotal))
    totalLine(
      'Delivery',
      order.deliveryFee === 0 ? 'Free' : amount(order.deliveryFee),
    )
    doc.moveTo(330, y).lineWidth(0.5).lineTo(R, y).stroke('#bbb')
    y += 7
    totalLine('Total (INR)', amount(order.total), true)

    // ── Footer ──
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#888')
      .text(
        'Bill of Supply issued by a composition taxpayer — no tax is ' +
          'charged. Computer-generated document; no signature required.',
        L,
        772,
        { width: W, align: 'center' },
      )

    doc.end()
  })
}
