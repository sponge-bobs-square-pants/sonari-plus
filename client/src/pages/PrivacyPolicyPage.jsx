import PolicyLayout from '../components/layout/PolicyLayout'
import { BRAND } from '../data/brand'

const UPDATED = '17 May 2026'

const INTRO = `This Privacy Policy explains how ${BRAND.legalName} Nightwear collects, uses and protects your personal information when you visit or shop with us. By using our website, you agree to the practices described here.`

const SECTIONS = [
  {
    heading: 'Information we collect',
    body: [
      'We collect information you give us directly, including:',
      {
        list: [
          'Your name, email address and phone number when you create an account or place an order.',
          'Shipping and billing addresses needed to deliver your order.',
          'The contents of messages you send us through the contact form or by email.',
          'Account login details — your password is always stored in encrypted (hashed) form, never as plain text.',
        ],
      },
      'We also collect some information automatically as you browse — your device and browser type, IP address, and the pages you visit — through cookies and similar technologies.',
      'Payment details are entered on our payment provider’s secure systems. We do not see or store your full card or banking information.',
    ],
  },
  {
    heading: 'How we use your information',
    body: [
      'We use the information we collect to:',
      {
        list: [
          'Process, fulfil and deliver your orders, and keep you updated on their status.',
          'Create and manage your account.',
          'Respond to your enquiries and provide customer support.',
          'Send you new arrivals, offers and updates — only if you have asked to receive them.',
          'Improve our website, our product selection and our service.',
          'Detect and prevent fraud, and meet our legal obligations.',
        ],
      },
    ],
  },
  {
    heading: 'Cookies',
    body: [
      'Cookies are small files stored on your device. We use essential cookies to keep you signed in and to remember your cart, and may use analytics cookies to understand how the site is used.',
      'You can control or delete cookies through your browser settings. Disabling essential cookies may stop parts of the site — such as your cart or account — from working properly.',
    ],
  },
  {
    heading: 'How we share your information',
    body: [
      'We do not sell your personal information. We share it only with parties who help us run the store, and only as far as needed:',
      {
        list: [
          'Payment providers, to process your payment securely.',
          'Courier and logistics partners, to deliver your order.',
          'Service providers such as our hosting and email providers.',
          'Authorities or professional advisers, where we are required to share it by law.',
        ],
      },
    ],
  },
  {
    heading: 'Data security',
    body: [
      'We take reasonable steps to protect your information — passwords are stored hashed, and data is transmitted over encrypted connections. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    heading: 'How long we keep your information',
    body: [
      'We keep your personal information for as long as your account is active or as needed to provide our services, and afterwards only as long as required to meet legal, accounting or reporting obligations.',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'You may ask us to:',
      {
        list: [
          'Access the personal information we hold about you.',
          'Correct information that is inaccurate or out of date.',
          'Delete your account and personal information, where we are not required to keep it.',
          'Stop sending you marketing messages at any time.',
        ],
      },
      'To make any of these requests, please contact us using the details below.',
    ],
  },
  {
    heading: 'Third-party links',
    body: [
      'Our website may contain links to other websites. We are not responsible for the privacy practices or content of those sites, and we encourage you to read their policies before sharing information.',
    ],
  },
  {
    heading: 'Children’s privacy',
    body: [
      'Our website is intended for use by adults. We do not knowingly collect personal information from children. If you believe a child has provided us with their information, please contact us and we will remove it.',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'We may update this Privacy Policy from time to time. Any changes will be posted on this page with a revised “last updated” date.',
    ],
  },
  {
    heading: 'Contact us',
    body: [
      'For any questions about this Privacy Policy or your personal information, reach us at:',
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

/** /privacy — the store's privacy policy. */
export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      updated={UPDATED}
      intro={INTRO}
      sections={SECTIONS}
    />
  )
}
