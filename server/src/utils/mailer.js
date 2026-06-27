import nodemailer from 'nodemailer';
import { signEmailVerifyToken } from './token.js';

/**
 * SMTP transport, built once from env.
 * - Port 465 → implicit TLS (`secure: true`).
 * - 587 / 2525 → STARTTLS (`secure: false`) — 2525 is the "DigitalOcean-
 *   friendly" alternate port many providers expose because DO's droplets
 *   block outbound 25 / 465 / 587 by default.
 * - SMTP_SECURE explicitly overrides the port heuristic when set
 *   ('true' / 'false') — useful for non-standard ports.
 */
const PORT = Number(process.env.SMTP_PORT) || 465;
const SECURE =
  process.env.SMTP_SECURE != null
    ? process.env.SMTP_SECURE.toLowerCase() === 'true'
    : PORT === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: PORT,
  secure: SECURE,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const FROM = process.env.EMAIL_FROM || 'nuit <support@nuit.in>';
// The storefront origin links point at (first of CLIENT_URL).
const SITE_URL = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')[0]
  .trim();
// Wordmark, hosted PNG (email clients strip SVG). Trimmed + 300px wide.
const LOGO =
  'https://res.cloudinary.com/dfovdz88b/image/upload/e_trim/w_300/v1779677482/brand/nuit-wordmark.png';

/** Low-level send. Throws on failure — callers decide whether to swallow it. */
export function sendMail({ to, subject, text, html, attachments }) {
  return transporter.sendMail({
    from: FROM,
    to,
    subject,
    text,
    html,
    attachments,
  });
}

const FONT = `-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;

/**
 * Shared brand shell for every transactional email — a warm oat card (so it
 * stands out on any inbox background) with the wordmark, an optional eyebrow,
 * and the sign-off. `body` is the email-specific inner HTML. Table-based +
 * inline styles for email-client compatibility.
 */
function emailShell({ eyebrow = '', body }) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0">
  <tr>
    <td align="center" style="padding:44px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#eae6df;border-radius:20px">
        <tr>
          <td style="padding:44px 40px;font-family:${FONT};color:#2e2a26">
            ${eyebrow ? `<p style="font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#8c8475;margin:0 0 14px">${eyebrow}</p>` : ''}
            <img src="${LOGO}" alt="nuit" width="96" style="display:block;width:96px;max-width:96px;height:auto;margin:0 0 32px;border:0" />
            ${body}
          </td>
        </tr>
      </table>
      <p style="font-family:${FONT};font-size:11px;letter-spacing:.04em;color:#a59c8e;margin:22px 0 0">nuit · Softness, by design</p>
    </td>
  </tr>
</table>`;
}

/**
 * Verification email content (subject/text/html). Pure — no sending, no env —
 * so it can be previewed.
 */
export function buildVerificationEmail({ name, link }) {
  const first = (name || '').split(' ')[0] || 'there';
  return {
    subject: 'Verify your email — nuit',
    text: `Hi ${first},\n\nConfirm your email for your nuit account:\n${link}\n\nThis link expires in 24 hours. If you didn't create an account, you can ignore this.\n\n— nuit`,
    html: emailShell({
      eyebrow: 'Welcome to',
      body: `
            <p style="font-size:15px;line-height:1.65;margin:0 0 6px">Hi ${first},</p>
            <p style="font-size:15px;line-height:1.65;margin:0 0 30px;color:#5c564e">Please confirm your email to finish setting up your account.</p>
            <a href="${link}" style="display:inline-block;background:#2e2a26;color:#fbfaf6;text-decoration:none;padding:15px 34px;border-radius:999px;font-size:12px;letter-spacing:.14em;text-transform:uppercase">Verify email</a>
            <p style="font-size:12px;line-height:1.65;color:#8c8475;margin:34px 0 0">This link expires in 24 hours.</p>
            <hr style="border:none;border-top:1px solid #d8d0c2;margin:32px 0 0">
            <p style="font-size:11px;line-height:1.6;color:#8c8475;margin:24px 0 0">If you didn't create a nuit account, you can safely ignore this email.</p>`,
    }),
  };
}

/**
 * Bill of Supply (invoice) email content. The PDF rides along as an
 * attachment (added by the sender); this also links the hosted copy.
 */
export function buildBillEmail({ name, orderNo, number, total }) {
  const first = (name || '').split(' ')[0] || 'there';
  const amount = `₹${Number(total).toLocaleString('en-IN')}`;
  return {
    subject: `Your invoice — nuit (order #${orderNo})`,
    text: `Hi ${first},\n\nYour Invoice for order #${orderNo} is attached to this email as a PDF.\n\nInvoice no: ${number}\nTotal: ${amount}\n\nKeep it for your records. You can also view it any time under Purchases in your nuit account.\n\n— nuit`,
    html: emailShell({
      eyebrow: 'Your invoice',
      body: `
            <p style="font-size:15px;line-height:1.65;margin:0 0 6px">Hi ${first},</p>
            <p style="font-size:15px;line-height:1.65;margin:0 0 26px;color:#5c564e">Your Invoice for order <strong style="color:#2e2a26">#${orderNo}</strong> is <strong style="color:#2e2a26">attached as a PDF</strong> — keep it for your records.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
              <tr><td style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8c8475;padding:0 24px 6px 0">Invoice no.</td><td style="font-size:14px;color:#2e2a26;padding:0 0 6px">${number}</td></tr>
              <tr><td style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8c8475;padding:0 24px 0 0">Total</td><td style="font-size:14px;color:#2e2a26">${amount}</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #d8d0c2;margin:32px 0 0">
            <p style="font-size:11px;line-height:1.6;color:#8c8475;margin:24px 0 0">You can also view this invoice any time under <strong style="color:#5c564e">Purchases</strong> in your account. It's an Invoice under the GST composition scheme — no tax is charged. Questions? Just reply.</p>`,
    }),
  };
}

/**
 * Email a customer their verification link. Best-effort — the caller should
 * NOT fail the request if this throws (signup still succeeds; they can resend).
 */
export function sendVerificationEmail(user) {
  const token = signEmailVerifyToken(user);
  const link = `${SITE_URL}/verify-email?token=${token}`;
  const { subject, text, html } = buildVerificationEmail({
    name: user.name,
    link,
  });
  return sendMail({ to: user.email, subject, text, html });
}

/**
 * Email a customer their Bill of Supply, with the PDF attached. Best-effort —
 * the bill is already generated + stored, so a mail failure must not fail the
 * request. `order` must be populated with `user` (name, email).
 */
export function sendBillOfSupplyEmail(order, pdf) {
  const orderNo = order._id.toString().slice(-8).toUpperCase();
  const { number } = order.billOfSupply;
  const { subject, text, html } = buildBillEmail({
    name: order.user?.name,
    orderNo,
    number,
    total: order.total,
  });
  return sendMail({
    to: order.user.email,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `nuit-invoice-${number.replace(/\//g, '-')}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });
}
