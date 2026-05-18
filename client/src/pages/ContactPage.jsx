import { useState } from 'react'
import Header from '../components/layout/Header'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import Reveal from '../components/ui/Reveal'
import { BRAND } from '../data/brand'

const CONTACT = {
  email: 'chawla1310@gmail.com',
  phone: '+91 94275 42349',
  hours: 'Monday – Saturday · 10am – 6pm IST',
  address: [
    `${BRAND.legalName} Nightwear`,
    'Sneh Sudha Complex, opp. Sursagar Lake',
    'Vadodara, Gujarat 390001',
  ],
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ContactDetail({ label, value, href }) {
  return (
    <div>
      <p className="eyebrow text-clay">{label}</p>
      <a
        href={href}
        className="mt-2 block text-sm text-ink transition-colors hover:text-clay"
      >
        {value}
      </a>
    </div>
  )
}

/** /contact — a message form plus the store's contact details. */
export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | error | done

  // One handler factory for every field — also clears a stale error.
  const field = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setStatus('idle')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (
      !form.name.trim() ||
      !EMAIL_RE.test(form.email) ||
      !form.message.trim()
    ) {
      setStatus('error')
      return
    }
    // TODO: POST to /api/contact once the backend route exists.
    setStatus('done')
  }

  return (
    <>
      <Header solid border={false} />

      <main className="min-h-screen bg-canvas px-6 pb-24 pt-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="eyebrow text-clay">Contact</p>
            <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-ink md:text-5xl">
              Say hello
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-clay">
              A question about an order, sizing or fabric — or a thought
              you&apos;d like to share. We read every message.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-14 md:grid-cols-[1.4fr_1fr] md:gap-20">
            {/* Message form */}
            <Reveal>
              {status === 'done' ? (
                <div className="border border-linen p-10 text-center">
                  <p className="font-display text-2xl font-light text-ink">
                    Thank you — your message is on its way. ♡
                  </p>
                  <p className="mt-3 text-sm text-clay">
                    We&apos;ll reply within a working day or two.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-7" noValidate>
                  <TextField
                    label="Your name"
                    value={form.name}
                    onChange={field('name')}
                  />
                  <TextField
                    label="Email address"
                    type="email"
                    value={form.email}
                    onChange={field('email')}
                  />
                  <label className="block">
                    <span className="eyebrow text-[0.625rem] text-clay">
                      Message
                    </span>
                    <textarea
                      value={form.message}
                      onChange={field('message')}
                      rows={5}
                      className="mt-2 w-full resize-none border-b border-ink/25 bg-transparent pb-2 text-sm text-ink transition-colors placeholder:text-clay/50 focus:border-ink focus:outline-none"
                    />
                  </label>

                  {status === 'error' && (
                    <p className="text-xs text-dusk">
                      Please add your name, a valid email and a message.
                    </p>
                  )}

                  <Button type="submit" variant="solid">
                    Send message
                  </Button>
                </form>
              )}
            </Reveal>

            {/* Contact details */}
            <Reveal delay={120}>
              <div className="space-y-8">
                <ContactDetail
                  label="Email"
                  value={CONTACT.email}
                  href={`mailto:${CONTACT.email}`}
                />
                <ContactDetail
                  label="Phone"
                  value={CONTACT.phone}
                  href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}
                />
                <div>
                  <p className="eyebrow text-clay">Hours</p>
                  <p className="mt-2 text-sm text-ink">{CONTACT.hours}</p>
                </div>
                <div>
                  <p className="eyebrow text-clay">Visit us</p>
                  <address className="mt-2 text-sm not-italic leading-relaxed text-ink">
                    {CONTACT.address.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </main>
    </>
  )
}
