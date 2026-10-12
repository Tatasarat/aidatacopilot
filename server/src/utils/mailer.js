'use strict';
const { appName, clientUrl, isProd } = require('../config/env');

const escapeHtml = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Sends through the Brevo HTTP API (works on hosts that block SMTP ports). */
async function sendEmail(to, subject, html, text) {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
    if (isProd()) throw new Error('Email is not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL).');
    console.log(`\n[email not configured: printing instead]\nTo: ${to}\nSubject: ${subject}\n${text || html}\n`);
    return { dev: true };
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: appName(), email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo error ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}

function shell(inner) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0d1b2a">
    <div style="font-weight:700;font-size:18px;margin-bottom:20px">${escapeHtml(appName())}</div>
    ${inner}
    <p style="color:#6b7a8a;font-size:12px;margin-top:32px">If you didn't expect this email, you can ignore it.</p>
  </div>`;
}

async function sendOTPEmail(to, otp) {
  await sendEmail(
    to,
    `Your ${appName()} verification code`,
    shell(`<p>Your verification code is:</p>
      <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:16px 0">${escapeHtml(otp)}</p>
      <p style="color:#6b7a8a;font-size:13px">It expires in 10 minutes. Never share this code.</p>`),
    `Your ${appName()} verification code is ${otp}. It expires in 10 minutes.`
  );
}

async function sendAccountExistsEmail(to) {
  await sendEmail(
    to,
    `You already have a ${appName()} account`,
    shell(`<p>Someone tried to create an account with this email, but you already have one.</p>
      <p><a href="${escapeHtml(clientUrl())}" style="color:#1b5e9b">Sign in</a> or use "Forgot password" if you need a new password.</p>`),
    `You already have a ${appName()} account. Sign in at ${clientUrl()}`
  );
}

async function sendPasswordResetEmail(to, resetLink) {
  await sendEmail(
    to,
    `Reset your ${appName()} password`,
    shell(`<p>Use the button below to choose a new password. The link expires in 30 minutes.</p>
      <p style="margin:24px 0"><a href="${escapeHtml(resetLink)}" style="background:#1b5e9b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600">Choose a new password</a></p>`),
    `Reset your ${appName()} password: ${resetLink} (expires in 30 minutes)`
  );
}

module.exports = { sendEmail, sendOTPEmail, sendAccountExistsEmail, sendPasswordResetEmail, escapeHtml };
