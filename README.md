# ShopPulse AI

AI analytics for small online stores. Upload orders and product costs, then get profit, margin, refund and stock answers where **every number shows its working**.

> "ShopPulse" is a working name. Check trademarks and domain availability before you use it commercially. The name shown in emails comes from `APP_NAME` on the server; the name in the app is in `client/src` (search for "ShopPulse").

## What is in here

```
server/   Node + Express API (Postgres, JWT auth, Razorpay, Brevo email, optional Mistral AI)
client/   React app (dashboard, Ask AI, weekly report, data upload, launch plan, billing, settings)
```

How the numbers stay trustworthy:

- **The AI never does arithmetic and never writes SQL.** `server/src/analytics/metrics.js` is plain, tested code. The AI only chooses one of seven approved analyses (`intents.js`) and explains the result.
- **Its wording is checked.** `ai/verify.js` rejects any explanation that contains a number not found in the computed result and falls back to a fixed template.
- **Every headline number has a "tape"** on the dashboard showing the formula and inputs behind it.
- With no `MISTRAL_API_KEY` the whole app still works. A keyword router picks the analysis and templates write the answer.

## Run it on your computer

You need Node 18+ and a Postgres database (a free Neon database works).

```
cd server
cp .env.example .env
```

Fill in `.env`: at least `DATABASE_URL` and `JWT_SECRET`. Generate a secret with:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then:

```
npm install
```
```
npm run dev
```

In a second terminal:

```
cd client
cp .env.example .env
```
```
npm install
```
```
npm start
```

Open http://localhost:3000. Without Brevo keys, the sign-up code and reset links are **printed in the server terminal** instead of emailed (development only).

Run the tests with `npm test` in `server/`.

## Before you deploy: read this

**1. Back up your database first.** On first boot the server migrates it:

- Existing users keep working. Their plain-text passwords are hashed once and the plain-text `password` column is dropped. This cannot be reversed, which is the point.
- Emails are now matched case-insensitively.
- Existing `user_credits` and `payments` rows are kept as they are. Plan ids stay `free`, `pro`, `enterprise` ("enterprise" is shown as "Business" in the app).
- Old tables the new code no longer uses are left untouched: `csv_data`, `analysis_history`, `user_profiles`, `marketplace_*`. Drop them yourself once you are happy.

**2. Rotate secrets.** Your repo previously had `server/node_modules` committed. If any API key (Mistral, Brevo, Razorpay, Neon) was ever committed or pasted anywhere public, rotate it.

**3. Sign-in sessions reset.** Old logins stop working. Users sign in again once.

**4. The Python AI service is no longer used.** The old `/query` and `/full-report` routes that called it are gone. `PYTHON_AI_URL` can be removed.

**5. The marketplace is removed.** It showed made-up download counts and had no files behind most listings.

## Environment variables

Server (`server/.env`, see `.env.example`):

| Variable | Needed for |
|---|---|
| `DATABASE_URL`, `JWT_SECRET` | Required. The server refuses to start without them |
| `CLIENT_URL` | Required in production. Your frontend address (CORS and email links). Comma-separate several |
| `NODE_ENV=production` | Production. Turns off dev email printing and the localhost origin |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | Sign-up codes, password resets, weekly reports. Use a sender on your own domain |
| `MISTRAL_API_KEY`, `MISTRAL_MODEL` | Optional AI wording and question routing |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Taking payments |
| `CRON_SECRET` | Lets a cron service call `POST /api/jobs/weekly-report` with header `X-Cron-Secret` |
| `ENABLE_SCHEDULER=true` | Alternative: built-in Monday 9:00 IST job. Needs an always-on server |

Client: `REACT_APP_API_URL` (your backend address, no trailing slash).

## Deploy (Render + Vercel)

- **Backend (Render web service):** root directory `server`, build `npm install`, start `npm start`. Set the variables above.
- **Frontend (Vercel):** root directory `client`, framework Create React App, set `REACT_APP_API_URL`.
- Free Render services sleep when idle, so for the weekly email use an external cron (cron-job.org, GitHub Actions) calling the job endpoint, not `ENABLE_SCHEDULER`.

## Business email for sending

1. Buy a domain.
2. In Brevo → Senders & domains, verify your domain and add the **SPF, DKIM and DMARC** records it shows. Without them, codes and reports land in spam.
3. Set `BREVO_SENDER_EMAIL=reports@yourdomain.com`.
4. For receiving mail (hello@, support@): Cloudflare Email Routing forwards for free; Zoho Mail or Google Workspace give real mailboxes.

## API at a glance

All under `/api`. Everything except sign-up, sign-in, reset, plans and CSV templates needs `Authorization: Bearer <token>`.

- `auth/send-otp`, `auth/register`, `auth/login`, `auth/me`, `auth/forgot-password`, `auth/reset-password`, `auth/change-password`, `PATCH auth/settings`, `DELETE auth/account`
- `data/template/:type`, `data/status`, `data/upload/:type` (`orders` or `products`), `data/sample`, `DELETE data`
- `analytics/overview?range=`, `analytics/report`, `analytics/report/email`, `analytics/ask`, `analytics/history`
- `billing/plans`, `billing/credits`, `billing/create-order`, `billing/verify`, `billing/history`
- `jobs/weekly-report` (cron secret)

## What is tested, and what is not

Tested here: 33 unit tests (metrics checked against hand calculations, CSV rules, the AI guardrails); a 65-step end-to-end run against a real Postgres, including migrating a legacy database; 12 payment-forgery attempts; the UI driven in a real browser on desktop and phone width.

**Not tested** (no keys or network in the build environment): a real Razorpay payment, a real Brevo email, and real Mistral calls. Test each once yourself before launch: sign up with a real email, pay for the smallest plan, ask three questions with the AI key set.

## Known limits

- Rate limits are held in memory per server instance. If you run several instances, move them to a shared store.
- The sign-in token is kept in the browser's local storage. Consider an httpOnly cookie later.
- Amounts are shown in one currency chosen in Settings. There is no conversion.
- No Shopify connection yet. This is deliberate: validate with CSV first, then add the official integration.
- Account deletion keeps *paid* payment records for accounting.
