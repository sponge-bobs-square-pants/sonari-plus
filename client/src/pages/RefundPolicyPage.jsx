import PolicyLayout from '../components/layout/PolicyLayout'

const UPDATED = '17 May 2026'

const INTRO =
  'We want you to be happy with your purchase. This policy explains when an order can be cancelled, how returns work, and how refunds are handled. Please read it before placing an order — and especially before opening your delivery.'

const SECTIONS = [
  {
    heading: 'Cancelling an order',
    body: [
      'You may cancel an order free of charge at any time before it has been dispatched — simply contact us with your order number, and we will cancel it and refund you in full.',
      'Once an order has been dispatched, it can no longer be cancelled. If you no longer wish to keep it, it will be treated as a return: a refund will be initiated only after deducting a restocking fee, which is the courier charge for carrying the parcel back. See “Restocking fee” below.',
    ],
  },
  {
    heading: 'Returns',
    body: [
      'You may request a return within 10 days of receiving your order. After 10 days we are unable to accept a return.',
      'To be eligible, the item must be unused and unworn, with all original tags and packaging intact.',
      'To start a return, contact us by email or phone with your order number and the reason for the return, and we will guide you through the next steps.',
    ],
  },
  {
    heading: 'Restocking fee',
    body: [
      'Returns and post-dispatch cancellations are subject to a restocking fee. This fee is the cost of shipping the product back to us, as charged by the courier company — it is not a charge we add ourselves.',
      'The restocking fee is deducted from your refund, and the remaining amount is returned to you.',
    ],
  },
  {
    heading: 'Inspection and approval',
    body: [
      'Returning a product does not automatically mean a full refund. Once the item reaches us, our team inspects it for quality, signs of wear and any damage.',
      'A refund is approved only once the item passes this inspection in resaleable condition. If the product shows signs of use or damage, or is missing its tags or packaging, the refund may be reduced or declined.',
    ],
  },
  {
    heading: 'Damaged or incorrect items',
    body: [
      'If your order arrives damaged, defective or incorrect, we will put it right — but we need proof of the issue at the moment of delivery.',
      'You must record a clear, continuous unboxing video that begins before the sealed package is opened and shows the damaged or incorrect product as it comes out of the parcel. Claims that are not supported by this video footage cannot be considered.',
      'Please report the issue, together with the video, within 2 days of delivery. Once we have verified it, a damaged or incorrect item is our responsibility — we will arrange a replacement or a full refund, with no restocking fee.',
    ],
  },
  {
    heading: 'Items that cannot be returned',
    body: [
      'For hygiene reasons, intimate items — such as briefs and panties — cannot be returned or exchanged once delivered, unless they arrive damaged or faulty and the claim is supported by the unboxing video described above.',
    ],
  },
  {
    heading: 'Refunds',
    body: [
      'Approved refunds are issued to your original payment method. Once a return has been received and approved, please allow 7 to 10 business days for the amount to reflect, depending on your bank or payment provider.',
    ],
  },
  {
    heading: 'Contact us',
    body: [
      'To cancel an order, start a return, or report a damaged or incorrect item, reach us at:',
      {
        list: [
          'Email — chawla1310@gmail.com',
          'Phone — +91 94275 42349',
          'Sonari Nightwear, Sneh Sudha Complex, opp. Sursagar Lake, Vadodara, Gujarat 390001',
        ],
      },
    ],
  },
]

/** /refund — the store's refund & cancellation policy. */
export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      title="Refund & Cancellation Policy"
      updated={UPDATED}
      intro={INTRO}
      sections={SECTIONS}
    />
  )
}
