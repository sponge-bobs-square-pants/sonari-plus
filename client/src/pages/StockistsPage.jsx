import PolicyLayout from '../components/layout/PolicyLayout'
import { BRAND } from '../data/brand'

const UPDATED = '29 June 2026'

const INTRO =
  'Most of nuit lives online — the catalogue you\'re browsing now is the full collection. For customers who would like to see a piece in hand before buying, our flagship store carries a curated selection.'

const SECTIONS = [
  {
    heading: 'Visit us — Vadodara',
    body: [
      `${BRAND.legalName} Nightwear is at Sneh Sudha Complex, opposite Sursagar Lake, Vadodara, Gujarat 390001.`,
      'The shop carries a rotating selection of the online collection. Stock varies week to week — if you are travelling specifically to see a piece, write to us a few days ahead and we will hold one in your size.',
      'Open Monday to Saturday, 11 am to 8 pm. Closed Sundays.',
    ],
  },
  {
    heading: 'Online — everywhere',
    body: [
      'Our online store at nuit.in carries the full collection and ships across India. Delivery is free on orders at or above ₹2,000; otherwise a flat ₹120 is added at checkout.',
      'See our Delivery & returns page for the full terms.',
    ],
  },
  {
    heading: 'Wholesale & retail partnerships',
    body: [
      'We are slowly opening to a small number of retail partners who share our editorial sensibility — boutiques rather than department stores, considered selection rather than wide assortment.',
      'If your store would like to carry a few pieces from nuit, please write to chawla1310@gmail.com with a short note about your shop and we will be in touch.',
    ],
  },
  {
    heading: 'Get in touch',
    body: [
      'For any question about availability, fittings, or simply directions to the shop — we are here.',
      {
        list: [
          'Email — chawla1310@gmail.com',
          'Phone — +91 94275 42349',
        ],
      },
    ],
  },
]

/** /stockists — where to find nuit (the shop + online). */
export default function StockistsPage() {
  return (
    <PolicyLayout
      title="Stockists"
      updated={UPDATED}
      intro={INTRO}
      sections={SECTIONS}
    />
  )
}
