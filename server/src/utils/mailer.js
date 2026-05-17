const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  }
});

async function sendOTPEmail(to, otp) {
  await transporter.sendMail({
    from: `"DataCopilot AI" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your DataCopilot verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0e1a; color: #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #3b82f6, #6366f1); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px;">⚡</div>
          <h1 style="font-size: 22px; font-weight: 600; margin-top: 16px; color: #e2e8f0;">DataCopilot AI</h1>
        </div>
        <p style="color: #94a3b8; font-size: 15px; margin-bottom: 24px;">Your verification code is:</p>
        <div style="background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #3b82f6;">${otp}</span>
        </div>
        <p style="color: #4b5563; font-size: 13px;">This code expires in <strong style="color: #94a3b8;">10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #374151; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  });
}

async function sendPasswordResetEmail(to, resetLink) {
  await transporter.sendMail({
    from: `"DataCopilot AI" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reset your DataCopilot password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0e1a; color: #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #3b82f6, #6366f1); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px;">⚡</div>
          <h1 style="font-size: 22px; font-weight: 600; margin-top: 16px; color: #e2e8f0;">Reset your password</h1>
        </div>
        <p style="color: #94a3b8; font-size: 15px; margin-bottom: 24px;">Click the button below to reset your password. This link expires in 30 minutes.</p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">Reset Password →</a>
        </div>
        <p style="color: #4b5563; font-size: 13px;">Or copy this link: <a href="${resetLink}" style="color: #3b82f6;">${resetLink}</a></p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #374151; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  });
}

module.exports = { sendOTPEmail, sendPasswordResetEmail };