/**
 * Sonari's legal identity — printed on every Bill of Supply. Sourced from
 * the GST registration certificate (Form GST REG-06).
 *
 * The business is registered under the GST COMPOSITION scheme, so the
 * customer document is a "Bill of Supply" — no tax is charged or shown —
 * and it must carry the composition declaration below.
 */
export const STORE = {
  legalName: 'Ashok Chawla HUF',
  tradeName: 'Sonari Night Wear',
  gstin: '24AAZHA0157P1ZS',
  address: {
    line1: 'B-29-30, Pramukhswami Nagar Soc.',
    line2: 'Harni Warshiya Ring Road, Near Mira Flat',
    city: 'Vadodara',
    state: 'Gujarat',
    pincode: '390006',
  },
  // Mandatory on a composition dealer's Bill of Supply (CGST Rules).
  // Standard wording — confirm verbatim with the CA before go-live.
  compositionDeclaration:
    'Composition taxable person, not eligible to collect tax on supplies',
}
