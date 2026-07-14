import nodemailer from 'nodemailer';

const from = () => process.env.EMAIL_FROM || 'GPSFDK ERP <onboarding@resend.dev>';

// A Resend API key — either explicit, or the SMTP password if it's a Resend key.
const resendKey = () =>
  process.env.RESEND_API_KEY ||
  (process.env.EMAIL_PASS?.startsWith('re_') ? process.env.EMAIL_PASS : null);

// Send via Resend's HTTPS API (port 443). Hosts like Render block outbound SMTP
// ports (465/587), so the HTTP API is the reliable path in production.
async function sendViaResendApi({ to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: from(), to: [to], subject, html, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { sent: false, error: data?.message || `Resend API error ${res.status}` };
  return { sent: true, id: data?.id };
}

// Lazily create an SMTP transport (Gmail, SendGrid, generic SMTP) as a fallback.
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;
  const port = Number(EMAIL_PORT) || 465;
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  return transporter;
}

/**
 * Sends an email. Prefers the Resend HTTPS API (works on hosts that block SMTP),
 * falls back to SMTP, and finally logs to the console (dev) so the flow never
 * blocks. Returns { sent: boolean, id?, error?, dev? }.
 */
export async function sendMail({ to, subject, html, text }) {
  // 1) Resend HTTPS API (production-safe — no SMTP ports).
  if (resendKey()) {
    try {
      return await sendViaResendApi({ to, subject, html, text });
    } catch (err) {
      console.error('📧 Resend API error:', err.message);
      return { sent: false, error: err.message };
    }
  }

  // 2) Generic SMTP fallback.
  const tx = getTransporter();
  if (tx) {
    try {
      const info = await tx.sendMail({ from: from(), to, subject, html, text });
      return { sent: true, id: info.messageId };
    } catch (err) {
      console.error('📧 Mailer error:', err.message);
      return { sent: false, error: err.message };
    }
  }

  // 3) Dev fallback — log instead of sending.
  console.log('\n📧 [DEV MAIL — no email provider configured, not actually sent]');
  console.log(`   To:      ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   ${text || '(html email)'}\n`);
  return { sent: false, dev: true };
}

/** Branded HTML for the "your account is ready" credentials email. */
export function credentialsEmail({ name, email, password, employeeId, role, loginUrl }) {
  const text =
    `Welcome to GPSFDK ERP, ${name}!\n\n` +
    `Your account has been created.\n\n` +
    `Employee ID: ${employeeId}\n` +
    `Login email: ${email}\n` +
    `Temporary password: ${password}\n` +
    `Role: ${role}\n\n` +
    `Sign in: ${loginUrl}\n\n` +
    `Please change your password after your first login (Profile → Change password).`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827">
    <div style="background:#1d4ed8;border-radius:12px 12px 0 0;padding:24px 28px;color:#fff">
      <h1 style="margin:0;font-size:20px;font-weight:800">GPSFDK.com</h1>
      <p style="margin:2px 0 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#bfdbfe">Enterprise Resource Planning</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px">
      <h2 style="margin:0 0 8px;font-size:18px">Welcome, ${name} 👋</h2>
      <p style="color:#4b5563;font-size:14px;margin:0 0 20px">An administrator has created your GPSFDK ERP account. Use the credentials below to sign in.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#6b7280">Employee ID</td><td style="padding:8px 0;font-weight:600;text-align:right">${employeeId}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Login email</td><td style="padding:8px 0;font-weight:600;text-align:right">${email}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Temporary password</td><td style="padding:8px 0;font-weight:700;text-align:right;font-family:monospace">${password}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Role</td><td style="padding:8px 0;font-weight:600;text-align:right">${role}</td></tr>
      </table>
      <a href="${loginUrl}" style="display:inline-block;margin:22px 0 8px;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px">Sign in to GPSFDK ERP</a>
      <p style="color:#9ca3af;font-size:12px;margin:16px 0 0">For your security, please change this password after your first login from <b>Profile → Change password</b>.</p>
    </div>
  </div>`;

  return { html, text };
}

/** Public base URL for links in emails — never localhost. */
export function appBaseUrl() {
  const origins = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
  const httpsOrigin = origins.find((o) => o.startsWith('https://'));
  return (process.env.APP_URL || httpsOrigin || 'https://gpserprefresh-client.vercel.app').replace(/\/+$/, '');
}

/** Branded HTML reminding a user of chat messages they haven't opened. */
export function unseenChatEmail({ name, count, senders = [] }) {
  const who = senders.length ? senders.join(', ') : 'your teammates';
  const chatUrl = `${appBaseUrl()}/chat`;
  const plural = count === 1 ? 'message' : 'messages';
  const text =
    `Hi ${name},\n\n` +
    `You have ${count} unread chat ${plural} on GPSFDK ERP from ${who}.\n\n` +
    `Open the chat to catch up: ${chatUrl}`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827">
    <div style="background:#0b5d3b;border-radius:12px 12px 0 0;padding:24px 28px;color:#fff">
      <h1 style="margin:0;font-size:20px;font-weight:800">GPSFDK.com</h1>
      <p style="margin:2px 0 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#bbf7d0">Enterprise Resource Planning</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px">
      <h2 style="margin:0 0 8px;font-size:18px">You have unread messages 💬</h2>
      <p style="color:#4b5563;font-size:14px;margin:0 0 8px">Hi ${name}, you have <b>${count}</b> unread chat ${plural} waiting for you.</p>
      <p style="color:#4b5563;font-size:14px;margin:0 0 20px">From: <b>${who}</b></p>
      <a href="${chatUrl}" style="display:inline-block;margin:4px 0 8px;background:#0b5d3b;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px">Open chat</a>
      <p style="color:#9ca3af;font-size:12px;margin:16px 0 0">You're getting this because these messages have been unread for over an hour. Open the chat to stop these reminders.</p>
    </div>
  </div>`;

  return { html, text };
}

/** Branded HTML for the password-reset OTP email. */
export function otpEmail({ name, otp, minutes = 10 }) {
  const text =
    `Hi ${name},\n\n` +
    `Your GPSFDK ERP password reset code is: ${otp}\n\n` +
    `It expires in ${minutes} minutes. If you didn't request this, you can ignore this email.`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827">
    <div style="background:#0b5d3b;border-radius:12px 12px 0 0;padding:24px 28px;color:#fff">
      <h1 style="margin:0;font-size:20px;font-weight:800">GPSFDK.com</h1>
      <p style="margin:2px 0 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#bbf7d0">Enterprise Resource Planning</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px">
      <h2 style="margin:0 0 8px;font-size:18px">Password reset code</h2>
      <p style="color:#4b5563;font-size:14px;margin:0 0 20px">Hi ${name}, use the code below to reset your password.</p>
      <div style="text-align:center;margin:8px 0 18px">
        <span style="display:inline-block;font-family:monospace;font-size:30px;font-weight:800;letter-spacing:8px;color:#0b5d3b;background:#f0fdf4;border:1px dashed #86efac;border-radius:10px;padding:14px 22px">${otp}</span>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin:0">This code expires in ${minutes} minutes. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  </div>`;

  return { html, text };
}
