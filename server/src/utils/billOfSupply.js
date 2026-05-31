import PDFDocument from 'pdfkit'
import { STORE } from '../config/store.js'

/** Indian financial year for a date — e.g. "2026-27" (FY runs Apr–Mar). */
export function financialYear(date) {
  const y = date.getFullYear()
  const startYear = date.getMonth() >= 3 ? y : y - 1 // April = month index 3
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

// Amounts: Indian digit grouping, two decimals, no currency glyph — the
// standard PDF fonts carry no ₹, so amounts are labelled "(INR)" instead.
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
 * The "nuit" wordmark — the four vector glyphs from the brand SVG
 * (client/src/assets/brand/nuit-wordmark-c.svg). Drawn straight into the
 * PDF as paths so the logo stays crisp at any size. Each glyph shares a
 * translate-y of 220 and a scale of (0.21, -0.21); only `tx` differs.
 */
const WORDMARK_GLYPHS = [
  {
    tx: 257.535,
    d: 'M25 14H102V415H25V429H186V322H188Q194 335 205.5 355.0Q217 375 237.0 394.0Q257 413 287.0 426.5Q317 440 360 440Q426 440 467.5 408.0Q509 376 509 306V14H586V0H346V14H423V337Q423 376 404.5 401.0Q386 426 347 426Q315 426 286.0 412.0Q257 398 235.0 373.0Q213 348 200.5 314.0Q188 280 188 240V14H265V0H25Z',
  },
  {
    tx: 385.845,
    d: 'M569 0H408V101H406Q397 81 384.5 60.5Q372 40 353.5 23.5Q335 7 310.5 -3.5Q286 -14 253 -14Q213 -14 188.0 -5.0Q163 4 149 14Q142 19 133.5 26.5Q125 34 118.0 47.0Q111 60 106.0 80.5Q101 101 101 131V415H24V429H187V122Q187 96 190.5 74.0Q194 52 204.0 35.5Q214 19 230.0 9.5Q246 0 272 0Q294 0 317.5 13.0Q341 26 360.5 50.0Q380 74 393.0 107.5Q406 141 406 183V415H330V429H492V14H569Z',
  },
  {
    tx: 510.375,
    d: 'M93 662Q93 684 108.5 699.5Q124 715 146 715Q168 715 183.5 699.5Q199 684 199 662Q199 640 183.5 624.5Q168 609 146 609Q124 609 108.5 624.5Q93 640 93 662ZM28 14H105V415H28V429H191V14H268V0H28Z',
  },
  {
    tx: 572.535,
    d: 'M17 429H94V558Q102 555 109.0 553.0Q116 551 133 551Q148 551 159.0 554.5Q170 558 180 566V429H322V415H180V88Q180 60 185.5 42.5Q191 25 200.0 15.5Q209 6 219.5 3.0Q230 0 240 0Q275 0 296.5 25.5Q318 51 324 84L338 79Q335 66 329.0 50.0Q323 34 310.5 19.5Q298 5 278.0 -4.5Q258 -14 228 -14Q153 -14 123.5 15.0Q94 44 94 97V415H17Z',
  },
]
// The glyphs' bounding box within the SVG's 900x360 viewBox.
const WM_X_MID = 453.15 // (leftmost 262.785 + rightmost 643.515) / 2
const WM_Y_TOP = 69.85
const WM_HEIGHT = 153.09 // bottom 222.94 − top 69.85
// Centre of the "i"-dot, as offsets (SVG units) from WM_X_MID / WM_Y_TOP —
// used to drop the crescent moon exactly where the dot sits.
const WM_DOT_DX = 87.885
const WM_DOT_DY = 11.13

/**
 * Draw the nuit wordmark `height` tall, horizontally centred on `centerX`,
 * with its top edge at `topY`.
 */
function drawWordmark(doc, centerX, topY, height, color) {
  const k = height / WM_HEIGHT
  doc.save()
  doc.translate(centerX - WM_X_MID * k, topY - WM_Y_TOP * k).scale(k, k)
  for (const g of WORDMARK_GLYPHS) {
    doc.save()
    doc.translate(g.tx, 220).scale(0.21, -0.21)
    doc.path(g.d).fill(color)
    doc.restore()
  }
  doc.restore()
}

// nuit brand palette — kept in sync with client/src/index.css (@theme).
const C = {
  canvas: '#fbfaf6', // warm near-white page
  oat: '#eae6df', // soft panel fill
  linen: '#e4ded4', // hairline dividers
  greige: '#c9c1b6', // muted light text on the ink bands
  clay: '#8c8475', // secondary / label text
  ink: '#2e2a26', // primary text + the "night" bands
  dusk: '#b89b97', // the one restrained accent — the crescent moon
}

/**
 * Draw the full brand mark: the light wordmark + the crescent moon set
 * as the dot of the "i". The moon scales with the wordmark height.
 */
function drawBrandmark(doc, centerX, topY, height) {
  drawWordmark(doc, centerX, topY, height, C.canvas)
  const k = height / WM_HEIGHT
  const moonR = height * (5 / 38) // 5pt at the 38pt masthead size
  const mx = centerX + WM_DOT_DX * k
  const my = topY + WM_DOT_DY * k
  doc.circle(mx, my, moonR).fill(C.dusk)
  doc.circle(mx - moonR * 0.72, my - moonR * 0.22, moonR).fill(C.ink)
}

/**
 * Render an order's Bill of Supply to a PDF buffer. Sonari is a GST
 * COMPOSITION dealer — so this is a Bill of Supply (no tax charged or
 * shown) carrying the mandatory composition declaration, NOT a tax invoice.
 *
 * Design — "Nocturne": the document is framed by two dark "night" bands,
 * a crescent moon dotting the wordmark. Long orders paginate: items flow
 * across pages, continuation pages get a compact header, and the totals
 * are kept whole on the final page.
 *
 * @param {object} order      a Mongoose Order document
 * @param {string} billNumber the pre-assigned consecutive serial
 * @returns {Promise<Buffer>}
 */
export function buildBillOfSupplyPdf(order, billNumber) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const PW = doc.page.width
    const PH = doc.page.height
    const L = 64 // left edge
    const R = PW - 64 // right edge
    const W = R - L // content width
    const cx = PW / 2
    const a = order.shippingAddress
    const orderRef = `#${order._id.toString().slice(-8).toUpperCase()}`

    const BOTTOM_H = 74 // height of the bottom night band
    const SAFE_BOTTOM = PH - BOTTOM_H - 24 // content must not pass this y

    const rule = (x1, x2, yy, color = C.linen) =>
      doc.moveTo(x1, yy).lineTo(x2, yy).lineWidth(0.75).stroke(color)

    // A small uppercase, letter-spaced label — the brand's "eyebrow".
    const eyebrow = (text, x, yy, w, align = 'left') =>
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(C.clay)
        .text(text.toUpperCase(), x, yy, {
          width: w,
          align,
          characterSpacing: 1.4,
        })

    const declaration =
      `${STORE.compositionDeclaration} — no tax is charged on this ` +
      'invoice. Computer-generated document; no signature required.'

    /**
     * Paint a page's chrome — background + the night bands. Page 1 gets
     * the full masthead; later pages a compact continuation header.
     * Returns the y at which page content may begin.
     */
    const paintChrome = (isFirst) => {
      doc.rect(0, 0, PW, PH).fill(C.canvas)
      doc.rect(0, PH - BOTTOM_H, PW, BOTTOM_H).fill(C.ink)
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(C.greige)
        .text(declaration, L, PH - 44, {
          width: W,
          align: 'center',
          lineGap: 2.5,
        })

      if (isFirst) {
        doc.rect(0, 0, PW, 178).fill(C.ink)
        drawBrandmark(doc, cx, 72, 38)
        doc.font('Helvetica-Bold').fontSize(8)
        const invW = doc.widthOfString('INVOICE', { characterSpacing: 3 })
        doc
          .fillColor(C.greige)
          .text('INVOICE', L, 134, {
            width: W,
            align: 'center',
            characterSpacing: 3,
          })
        rule(cx - invW / 2 - 44, cx - invW / 2 - 14, 138, C.greige)
        rule(cx + invW / 2 + 14, cx + invW / 2 + 44, 138, C.greige)
        return 214
      }

      doc.rect(0, 0, PW, 100).fill(C.ink)
      drawBrandmark(doc, cx, 40, 23)
      doc
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .fillColor(C.greige)
        .text(`INVOICE ${billNumber}  ·  CONTINUED`, L, 78, {
          width: W,
          align: 'center',
          characterSpacing: 2,
        })
      return 136
    }

    // Items column geometry.
    const qtyR = R - 188
    const rateR = R - 94
    const itemsHeader = (yy) => {
      rule(L, R, yy)
      yy += 13
      eyebrow('Item', L, yy, 240)
      eyebrow('Qty', qtyR - 56, yy, 56, 'right')
      eyebrow('Rate', rateR - 70, yy, 70, 'right')
      eyebrow('Amount', R - 96, yy, 96, 'right')
      yy += 16
      rule(L, R, yy)
      return yy + 18
    }

    let y = paintChrome(true)

    // ── Meta row (page 1) ──────────────────────────────────────
    const meta = [
      ['Invoice no.', billNumber],
      ['Issued', longDate(new Date())],
      ['Order ref', orderRef],
      ['Order date', longDate(order.createdAt)],
    ]
    meta.forEach(([label, value], i) => {
      const mx = L + (i * W) / 4
      eyebrow(label, mx, y, W / 4)
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(C.ink)
        .text(value, mx, y + 13, { width: W / 4 - 8 })
    })
    rule(L, R, y + 40)

    // ── From / Billed to (page 1) ──────────────────────────────
    const bt = y + 64
    const cR = L + W / 2 + 14
    const cW = R - cR
    eyebrow('From', L, bt, 200)
    eyebrow('Billed to', cR, bt, cW)
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(C.ink)
      .text(STORE.tradeName, L, bt + 15, { width: W / 2 - 14 })
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(C.clay)
      .text(
        [
          STORE.legalName,
          `GSTIN  ${STORE.gstin}`,
          STORE.address.line1,
          STORE.address.line2,
          `${STORE.address.city}, ${STORE.address.state} ${STORE.address.pincode}`,
        ].join('\n'),
        L,
        bt + 32,
        { width: W / 2 - 14, lineGap: 3.5 },
      )
    const fromB = doc.y
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(C.ink)
      .text(a.fullName, cR, bt + 15, { width: cW })
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(C.clay)
      .text(
        [
          a.line1 + (a.line2 ? `, ${a.line2}` : ''),
          `${a.city}, ${a.state} ${a.pincode}`,
          a.phone,
        ].join('\n'),
        cR,
        bt + 32,
        { width: cW, lineGap: 3.5 },
      )
    const toB = doc.y

    // ── Items — flowing across pages ───────────────────────────
    y = Math.max(fromB, toB) + 30
    y = itemsHeader(y)

    order.items.forEach((it) => {
      // Bras combine band + cup ('32' + 'B' → '32B'); others are just size.
      const sizeLabel = it.cup ? `${it.size}${it.cup}` : it.size
      const variant = [it.color, sizeLabel].filter(Boolean).join('   ·   ')
      // When the line was sold at a discount, the row grows enough to
      // carry a small struck-through MRP beneath the Rate.
      const hasMrp = it.mrp != null && it.mrp > it.price
      const rowH = (variant ? 36 : 28) + (hasMrp ? 10 : 0)
      // New page when the next row would cross the safe limit.
      if (y + rowH > SAFE_BOTTOM) {
        doc.addPage()
        y = itemsHeader(paintChrome(false))
      }
      doc
        .font('Helvetica')
        .fontSize(10.5)
        .fillColor(C.ink)
        .text(it.name, L, y, { width: 240 })
      if (variant)
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(C.clay)
          .text(variant, L, y + 14, { width: 240 })
      doc.font('Helvetica').fontSize(10).fillColor(C.clay)
      doc.text(String(it.quantity), qtyR - 56, y + 1, {
        width: 56,
        align: 'right',
      })
      doc.text(amount(it.price), rateR - 70, y + 1, {
        width: 70,
        align: 'right',
      })
      if (hasMrp) {
        // MRP struck-through beneath the Rate — establishes the discount
        // explicitly on the invoice itself.
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(C.greige)
          .text(amount(it.mrp), rateR - 70, y + 14, {
            width: 70,
            align: 'right',
            strike: true,
          })
      }
      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor(C.ink)
        .text(amount(it.price * it.quantity), R - 96, y, {
          width: 96,
          align: 'right',
        })
      y += rowH
    })
    rule(L, R, y)

    // ── Totals — kept whole; pushed to a new page if they won't fit ──
    if (y + 150 > SAFE_BOTTOM) {
      doc.addPage()
      y = paintChrome(false)
    }
    y += 22
    const sumLabelX = R - 250
    const sumValW = 130
    const sumRow = (label, value) => {
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(C.clay)
        .text(label, sumLabelX, y, { width: 120 })
      doc
        .fillColor(C.ink)
        .text(value, R - sumValW, y, { width: sumValW, align: 'right' })
      y += 19
    }
    sumRow('Subtotal', amount(order.subtotal))
    sumRow(
      'Delivery',
      order.deliveryFee === 0 ? 'Free' : amount(order.deliveryFee),
    )
    y += 5
    rule(sumLabelX, R, y)
    y += 14
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor(C.clay)
      .text('TOTAL PAYABLE  ·  INR', R - 220, y, {
        width: 220,
        align: 'right',
        characterSpacing: 1.4,
      })
    doc
      .font('Helvetica-Bold')
      .fontSize(21)
      .fillColor(C.ink)
      .text(amount(order.total), R - 220, y + 11, {
        width: 220,
        align: 'right',
      })

    // ── Closing line ───────────────────────────────────────────
    doc
      .font('Helvetica-Oblique')
      .fontSize(10.5)
      .fillColor(C.clay)
      .text('Thank you for choosing nuit.', L, y + 57, {
        width: W,
        align: 'center',
      })

    // ── Page numbers — only when the invoice runs to more than one ──
    const range = doc.bufferedPageRange()
    if (range.count > 1) {
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i)
        doc
          .font('Helvetica-Bold')
          .fontSize(6.5)
          .fillColor(C.greige)
          .text(`PAGE ${i + 1} OF ${range.count}`, L, PH - 60, {
            width: W,
            align: 'center',
            characterSpacing: 1.5,
          })
      }
    }

    doc.end()
  })
}
