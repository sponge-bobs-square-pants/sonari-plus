/**
 * Brand identity — the single source of truth for the store's NAME.
 *
 * The logo MARK itself is the <Wordmark> SVG (components/brand/Wordmark.jsx),
 * not text — restyle the logo by swapping that art, not here.
 *
 * The fields are split into GROUPS so each can be changed on its own:
 *
 *  GROUP B · `name` — the consumer-facing brand: marketing copy, page
 *  titles, the footer column heading, the auth screens.
 *
 *  GROUP C · `legalName` — the registered business name: the policy pages
 *  (Terms / Privacy / Refund), the contact card and the checkout merchant
 *  name. If the CA confirms the GST-registered name must stay, set this
 *  ONE line back to 'Sonari' — Group B is left untouched.
 *
 *  The server keeps its OWN copy of the legal / trade name for the Bill
 *  of Supply in server/src/config/store.js — that file is the
 *  server-side Group C toggle; change it there too if needed.
 */
export const BRAND = {
  name: 'nuit',
  // GROUP C is currently OFF — kept as 'Sonari' pending the CA's
  // confirmation. Set to 'nuit' to switch the legal name over.
  legalName: 'Sonari',
}
