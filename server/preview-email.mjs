import { writeFileSync } from 'fs'
import { buildVerificationEmail } from './src/utils/mailer.js'

const { subject, html } = buildVerificationEmail({
  name: 'Aanya Sharma',
  link: 'https://www.nuit.in/verify-email?token=SAMPLE_TOKEN_xxxxxxxx',
})
// The email now carries its own background — just wrap minimally.
writeFileSync(
  'sample-verification-email.html',
  `<!doctype html><html><head><meta charset="utf-8"><title>${subject}</title></head><body style="margin:0">${html}</body></html>`,
)
console.log('Subject:', subject, '\nWrote sample-verification-email.html')
