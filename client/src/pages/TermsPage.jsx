import PolicyLayout from '../components/layout/PolicyLayout'
import { BRAND } from '../data/brand'

const UPDATED = '27 June 2026'

const INTRO = `These Terms & Conditions govern your use of the ${BRAND.legalName} Nightwear website and any purchase you make from it. Please read them carefully — by browsing the site or placing an order, you agree to be bound by these terms.`

const SECTIONS = [
  {
    heading: 'About us',
    body: [
      `${BRAND.legalName} Nightwear is a family-run store offering women’s nightwear, sleepwear and intimates sourced from a range of trusted brands. In these terms, “we”, “us” and “our” refer to ${BRAND.legalName} Nightwear; “you” refers to the person using the website or placing an order.`,
    ],
  },
  {
    heading: 'Using our website',
    body: [
      'To place an order you must be able to enter into a legally binding contract. If you are under 18, you may use the site and order only with the involvement of a parent or guardian.',
      'You agree to use the website only for lawful purposes — not to disrupt it, access it through unauthorised automated means, or use it in any way that infringes the rights of others.',
    ],
  },
  {
    heading: 'Products and availability',
    body: [
      'Our products are sourced from various brands. We aim to describe and picture every piece as accurately as possible, but slight differences in colour and detail can occur depending on your screen.',
      'All products are subject to availability. We may add, change or withdraw products, and limit quantities, at any time without notice.',
    ],
  },
  {
    heading: 'Pricing',
    body: [
      'All prices are listed in Indian Rupees (₹) and include applicable taxes unless stated otherwise. Delivery charges, where they apply, are shown before you complete your order.',
      'We take care to price products correctly, but errors can occur. If we discover an error in the price of an item you have ordered, we will contact you and give you the choice of continuing at the correct price or cancelling the order.',
    ],
  },
  {
    heading: 'Orders',
    body: [
      'When you place an order, you are making an offer to buy. We will send an order confirmation by email; a binding contract is formed only once we confirm that your order has been dispatched.',
      'We may decline or cancel an order — for example, if an item is out of stock, if there has been a pricing error, if we are unable to deliver to your area, or if we suspect fraud. If we cancel an order you have already paid for, we will refund you in full.',
    ],
  },
  {
    heading: 'Payment',
    body: [
      'Payment is taken through our secure third-party payment provider. Card and banking details are entered on the provider’s systems — we do not see or store them.',
      'Your order is processed once payment has been authorised and received in full.',
    ],
  },
  {
    heading: 'Shipping policy',
    body: [
      'We currently ship within India only. Delivery is free on orders at or above ₹2,000; below that threshold, delivery charges are shown at checkout. Orders are shipped through registered domestic courier companies and/or India Post (Speed Post) only.',
      `Orders are delivered within 7 days from the date of the order and/or payment, or by the delivery date agreed at the time of order confirmation, subject to courier company or postal authority norms. ${BRAND.legalName} Nightwear shall not be liable for any delay in delivery by the courier company or postal authority.`,
      'Delivery of all orders is made to the address provided by the buyer at the time of purchase. Delivery is confirmed by email to the address specified at the time of registration. Responsibility for the products passes to you once they are delivered to the address you provided.',
      'Where shipping charges are levied at checkout, they are non-refundable.',
    ],
  },
  {
    heading: 'Returns, refunds and cancellations',
    body: [
      'Returns, refunds and order cancellations are governed by our separate Refund & Cancellation Policy, which forms part of these Terms & Conditions.',
    ],
  },
  {
    heading: 'Your account',
    body: [
      'If you create an account, you are responsible for keeping your password confidential and for all activity that takes place under it. Please tell us promptly if you believe your account has been used without your permission.',
      'We may suspend or close an account if these terms are breached or if we suspect misuse.',
    ],
  },
  {
    heading: 'Intellectual property',
    body: [
      `The content of this website — including its text, design, layout, logos and images — belongs to ${BRAND.legalName} Nightwear or its partners and licensors. You may not copy, reproduce or reuse it without our written permission.`,
    ],
  },
  {
    heading: 'Limitation of liability',
    body: [
      'The website is provided on an “as is” basis. To the fullest extent permitted by law, we are not liable for any indirect or consequential loss arising from your use of the site or our products.',
      'Nothing in these terms excludes or limits any liability that cannot be excluded or limited under applicable law.',
    ],
  },
  {
    heading: 'Third-party links',
    body: [
      'Our website may link to other websites that we do not control. We are not responsible for their content or practices, and including a link does not imply our endorsement.',
    ],
  },
  {
    heading: 'Changes to these terms',
    body: [
      'We may update these Terms & Conditions from time to time. The current version will always be posted on this page with a revised “last updated” date, and continued use of the website means you accept the updated terms.',
    ],
  },
  {
    heading: 'Governing law',
    body: [
      'These Terms & Conditions are governed by the laws of India. Any disputes arising from them are subject to the exclusive jurisdiction of the courts of Vadodara, Gujarat.',
    ],
  },
  {
    heading: 'Contact us',
    body: [
      'For any questions about these Terms & Conditions, reach us at:',
      {
        list: [
          'Email — chawla1310@gmail.com',
          'Phone — +91 94275 42349',
          `${BRAND.legalName} Nightwear, Sneh Sudha Complex, opp. Sursagar Lake, Vadodara, Gujarat 390001`,
        ],
      },
    ],
  },
]

/** /terms — the store's terms & conditions. */
export default function TermsPage() {
  return (
    <PolicyLayout
      title="Terms & Conditions"
      updated={UPDATED}
      intro={INTRO}
      sections={SECTIONS}
    />
  )
}
