// One-shot SMTP connection + auth verifier.
// Run with: node verify-smtp.mjs
// Uses the same env as the live mailer, so what works here works in prod.
//
// Three possible outcomes:
//   ✓ SMTP READY            → port reachable + TLS handshake OK + auth OK
//   ✗ Connection error      → port blocked, or provider not listening on it
//   ✗ Auth error            → port reachable but username / password wrong
//
// Drop the file when you've finished checking — it's not used at runtime.
import 'dotenv/config';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.SMTP_PORT) || 465;
const SECURE =
  process.env.SMTP_SECURE != null
    ? process.env.SMTP_SECURE.toLowerCase() === 'true'
    : PORT === 465;

console.log(
  `→ host=${process.env.SMTP_HOST} port=${PORT} secure=${SECURE} user=${process.env.SMTP_USER ? '<set>' : '(missing)'}`,
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: PORT,
  secure: SECURE,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
});

try {
  await transporter.verify();
  console.log('✓ SMTP READY — connection + auth succeeded.');
  process.exit(0);
} catch (err) {
  console.error('✗ SMTP FAILED:', err.message);
  if (err.code) console.error('  code:', err.code);
  if (err.command) console.error('  command:', err.command);
  process.exit(1);
}
