import nodemailer from 'nodemailer';

/**
 * Builds the SMTP transport from the function's env vars (Brevo relay by
 * default). Throws when SMTP is not configured so callers can decide whether
 * that is fatal.
 */
export function createMailer() {
  const user = process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  if (!user || !pass || !from) {
    throw new Error('SMTP_USERNAME, SMTP_PASSWORD, or SMTP_FROM is not configured in the function environment variables');
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // STARTTLS
    auth: { user, pass },
  });
  return { transporter, from: `"Solar Shine" <${from}>` };
}

/** Escapes user-supplied text before interpolating it into an HTML email. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
