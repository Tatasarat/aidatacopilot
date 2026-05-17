const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  }
});

async function sendOTPEmail(to, otp) {
  await transporter.sendMail({
    from: `"InsightAI" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your InsightAI verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0e1a; border-radius: 12px;">
        <h1 style="text-align:center; color: #e2e8f0;">🧠 InsightAI</h1>
        <p style="color: #94a3b8; font-size: 15px;">Your verification code is:</p>
        <div style="background: #111827; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #3b82f6;">${otp}</span>
        </div>
        <p style="color: #4b5563; font-size: 13px;">Expires in 10 minutes. Do not share this code.</p>
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
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0e1a; border-radius: 12px;">
        <h1 style="text-align:center; color: #e2e8f0;">🧠 InsightAI</h1>
        <p style="color: #94a3b8; font-size: 15px;">Click below to reset your password. Expires in 30 minutes.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">Reset Password →</a>
        </div>
      </div>
    `
  });
}

module.exports = { sendOTPEmail, sendPasswordResetEmail };