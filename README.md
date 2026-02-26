# Pees & Queues

Real-time bathroom queue coordination for small groups (trips, cabins, retreats). One host creates a trip and share an invite link; participants join via the link and use SMS to join queues and get turn notifications.

## Stack

- **Frontend**: React, Vite, TailwindCSS, PWA (installable)
- **Backend**: Node.js, Fastify
- **Database**: Supabase (Postgres)
- **SMS**: Twilio webhooks

## Setup

### 1. Database

Create a Supabase project and run the initial migration:

- Open Supabase Dashboard → SQL Editor.
- Run the contents of `backend/migrations/001_initial.sql`, then `backend/migrations/002_payments.sql`.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TWILIO_* and PUBLIC_ORIGIN
npm install
npm run dev
```

Runs on http://localhost:3000.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173 and proxies `/api` and `/webhooks` to the backend.

### 4. Twilio

- Create a Twilio account and get a phone number.
- Set the SMS webhook URL to: `https://your-public-host/webhooks/twilio/sms` (use ngrok for local: `https://<ngrok-id>.ngrok.io/webhooks/twilio/sms`).
- For local dev, use Twilio trial and verify recipient numbers.

### 5. Reminder job (30 min)

Call periodically (e.g. cron every 5 minutes):

```bash
curl -X POST https://your-host/api/cron/reminders -H "Authorization: Bearer YOUR_CRON_SECRET"
```

If `CRON_SECRET` is not set, the endpoint still runs (no auth).

## Environment variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number (E.164) |
| `PORT` | Backend port (default 3000) |
| `PUBLIC_ORIGIN` | Public app origin for invite links (e.g. https://app.example.com) |
| `STRIPE_SECRET_KEY` | Stripe secret key (for $1/trip checkout) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (for `checkout.session.completed`) |
| `STRIPE_PRICE_ID` | Stripe Price ID for one-time $1 trip |
| `CRON_SECRET` | Optional secret for `/api/cron/reminders` |

### Payments and discount codes

- Trips cost $1 and are valid for 7 days. After payment (Stripe Checkout), the trip is activated.
- To create a **free** trip (e.g. for testing), add a 100% discount code in Supabase:  
  `INSERT INTO discount_codes (code, type, percent_off, max_uses) VALUES ('TEST100', 'percent', 100, 100);`  
  Then enter `TEST100` in the discount code field on Create Trip.
- Stripe webhook: add endpoint `https://your-api-host/webhooks/stripe`, subscribe to `checkout.session.completed`, and set `STRIPE_WEBHOOK_SECRET` from the dashboard.

## SMS commands

Participants text the trip number:

- **JOIN** – join bathroom queue (if multiple bathrooms: `JOIN Main` or `JOIN 1`)
- **DONE** – finished; next person is notified
- **STATUS** – see your position in each queue
- **HELP** – list commands

## Deploy

- **Backend**: Deploy the `backend` folder to a VPS, Fly.io, or Render. Set env vars and run migrations (Supabase SQL).
- **Frontend**: Build with `npm run build`; serve `dist/` with the backend (e.g. `fastify-static`) or a CDN. Set `PUBLIC_ORIGIN` to the production URL.
- **PWA**: Ensure HTTPS. Icons are in `frontend/public/icons/` (replace with your own 192x192 and 512x512 PNGs if desired).
