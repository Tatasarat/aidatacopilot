const https = require('https');

async function sendEmail(to, subject, html) {
  const data = JSON.stringify({
    from: 'InsightAI <onboarding@resend.dev>',
    to: [to],
    subject,
    html
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Resend API error: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendOTPEmail(to, otp) {
  await sendEmail(to, 'Your InsightAI verification code', `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0e1a; border-radius: 12px;">
      <h1 style="text-align:center; color: #e2e8f0;">🧠 InsightAI</h1>
      <p style="color: #94a3b8; font-size: 15px;">Your verification code is:</p>
      <div style="background: #111827; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #3b82f6;">${otp}</span>
      </div>
      <p style="color: #4b5563; font-size: 13px;">Expires in 10 minutes. Do not share this code.</p>
    </div>
  `);
}

async function sendPasswordResetEmail(to, resetLink) {
  await sendEmail(to, 'Reset your InsightAI password', `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0e1a; border-radius: 12px;">
      <h1 style="text-align:center; color: #e2e8f0;">🧠 InsightAI</h1>
      <p style="color: #94a3b8; font-size: 15px;">Click below to reset your password. Expires in 30 minutes.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}" style="background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">Reset Password →</a>
      </div>
    </div>
  `);
}

module.exports = { sendOTPEmail, sendPasswordResetEmail };