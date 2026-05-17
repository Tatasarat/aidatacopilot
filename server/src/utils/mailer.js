const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendOTPEmail(to, otp) {
  await transporter.sendMail({
    from: `"InsightAI" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your InsightAI verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0e1a; color: #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 600; color: #e2e8f0;">🧠 InsightAI</h1>
        </div>
        <p style="color: #94a3b8; font-size: 15px; margin-bottom: 24px;">Your verification code is:</p>
        <div style="background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #3b82f6;">${otp}</span>
        </div>
        <p style="color: #4b5563; font-size: 13px;">This code expires in <strong style="color: #94a3b8;">10 minutes</strong>.</p>
      </div>
    `
  });
}

async function sendPasswordResetEmail(to, resetLink) {
  await transporter.sendMail({
    from: `"InsightAI" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reset your InsightAI password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0e1a; color: #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 600; color: #e2e8f0;">🧠 InsightAI</h1>
        </div>
        <p style="color: #94a3b8; font-size: 15px; margin-bottom: 24px;">Click below to reset your password. Expires in 30 minutes.</p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetLink}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">Reset Password →</a>
        </div>
      </div>
    `
  });
}

module.exports = { sendOTPEmail, sendPasswordResetEmail };