import { Resend } from 'resend';

// Lazily create the Resend client so the server still boots without a key.
let resend = null;
function getClient() {
  if (resend) return resend;
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM = process.env.MAIL_FROM || 'GPSFDK ERP <onboarding@resend.dev>';

/**
 * Sends an email via Resend. If no RESEND_API_KEY is configured, it logs the
 * message to the console instead (dev fallback) so the flow never blocks.
 * Returns { sent: boolean, id?, error? }.
 */
export async function sendMail({ to, subject, html, text }) {
  const client = getClient();

  if (!client) {
    console.log('\n📧 [DEV MAIL — no RESEND_API_KEY set, not actually sent]');
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   ${text || '(html email)'}\n`);
    return { sent: false, dev: true };
  }

  try {
    const { data, error } = await client.emails.send({ from: FROM, to, subject, html, text });
    if (error) {
      console.error('📧 Resend error:', error);
      return { sent: false, error: error.message || 'Email failed' };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error('📧 Mailer exception:', err.message);
    return { sent: false, error: err.message };
  }
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
