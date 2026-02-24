# Getting Pees & Queues Online (peesandqueues.app)

Step-by-step guide to deploy with **Vercel** (frontend), **Render** (backend), **Twilio** (SMS), and **Supabase** (database). Domain: **peesandqueues.app**.

You’ll end up with:

- **App:** https://peesandqueues.app (or https://www.peesandqueues.app) → Vercel  
- **API:** https://api.peesandqueues.app (or a Render URL) → Render  
- **SMS:** Twilio number receiving/sending messages, webhook pointing at your API  

---

## 1. Database (Supabase)

Do this first; both backend and migrations need it.

1. Go to [supabase.com](https://supabase.com) and create a project (e.g. “peesandqueues”).
2. In the dashboard: **Project Settings → API**:
   - Copy **Project URL** → you’ll use as `SUPABASE_URL`.
   - Copy **service_role** key (under “Project API keys”) → `SUPABASE_SERVICE_ROLE_KEY`. Keep it secret.
3. **SQL Editor**: open `backend/migrations/001_initial.sql` from the repo, paste the full contents, and **Run**. Confirm tables exist under **Table Editor**.

---

## 2. Backend on Render

The app needs a Node server for the API and Twilio webhooks.

1. **Render:** [render.com](https://render.com) → Sign in (e.g. GitHub).
2. **New → Web Service**.
3. Connect the **peesandqueues** GitHub repo.
4. **Settings:**
   - **Name:** `peesandqueues-api` (or similar).
   - **Root Directory:** `backend`.
   - **Runtime:** Node.
   - **Build Command:** `npm install`.
   - **Start Command:** `npm start` (or `node src/index.js`).
   - **Instance type:** Free (or paid if you want no cold starts).
5. **Environment variables** (Render dashboard → Environment):
   - `NODE_ENV` = `production`
   - `PORT` = `3000` (Render sets this; you can leave it.)
   - `SUPABASE_URL` = (from Supabase)
   - `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase)
   - `TWILIO_ACCOUNT_SID` = (from Twilio, step 3)
   - `TWILIO_AUTH_TOKEN` = (from Twilio)
   - `TWILIO_PHONE_NUMBER` = (e.g. `+15551234567`)
   - `PUBLIC_ORIGIN` = `https://peesandqueues.app` (or `https://www.peesandqueues.app` if you use www)
   - `CRON_SECRET` = (generate a long random string for the reminder job)
6. **Deploy.** When it’s live, note the URL, e.g. `https://peesandqueues-api.onrender.com`.  
   You’ll use this as the **API base URL** for the frontend and for the Twilio webhook.

---

## 3. Twilio (SMS)

1. [twilio.com](https://twilio.com) → Sign up / sign in.
2. **Phone Numbers → Manage → Buy a number** (or use a trial number; trial has limits on who can receive SMS).
3. Note:
   - **Account SID** and **Auth Token** (Console dashboard) → already used in Render env.
   - **Phone Number** (E.164, e.g. `+15551234567`) → `TWILIO_PHONE_NUMBER` on Render.
4. **Phone Numbers → Manage → Active Numbers** → click your number.
5. Under **Messaging**:
   - **A MESSAGE COMES IN:** Webhook, `https://YOUR-RENDER-URL/webhooks/twilio/sms` (e.g. `https://peesandqueues-api.onrender.com/webhooks/twilio/sms`).
   - Method: **POST**.
   - Save.

If you later use a custom API domain (e.g. `https://api.peesandqueues.app`), update this webhook to that host + path.

---

## 4. Frontend on Vercel

1. **Vercel:** [vercel.com](https://vercel.com) → Sign in with GitHub.
2. **Add New → Project** → Import the **peesandqueues** repo.
3. **Settings:**
   - **Root Directory:** `frontend` (not the repo root).
   - **Framework Preset:** Vite.
   - **Build Command:** `npm run build` (default).
   - **Output Directory:** `dist` (default).
4. **Environment variables:**
   - `VITE_API_ORIGIN` or similar is optional; if your frontend calls the API via a relative path like `/api`, you’ll need to proxy (see below).  
   - Easiest: set **one** public env var that the frontend uses as the API base, e.g.  
     `VITE_API_URL` = `https://peesandqueues-api.onrender.com`  
     (or `https://api.peesandqueues.app` after you add the custom domain for the backend).
5. **Deploy.** Note the Vercel URL (e.g. `peesandqueues.vercel.app`).

**Important:** The current app uses relative paths like `/api/trips`. On Vercel there is no backend, so those requests will 404 unless you proxy them.

**Option A – Proxy in Vercel (recommended)**  
The repo includes `frontend/vercel.json` with rewrites so that `/api` and `/webhooks` are forwarded to your backend.

- Open **frontend/vercel.json** and replace `peesandqueues-api.onrender.com` with your actual Render service hostname (e.g. from the Render dashboard URL, or use `api.peesandqueues.app` once you’ve set up that custom domain).
- Deploy. The browser will request `https://peesandqueues.app/api/...` and Vercel will proxy to your Render backend. No frontend code changes needed.

**Option B – Call API by absolute URL**  
Set `VITE_API_URL=https://peesandqueues-api.onrender.com` (or your API domain) and in the frontend replace every `fetch('/api/...')` with `fetch(\`${import.meta.env.VITE_API_URL}/api/...\`)`. Then no proxy needed, but you must configure CORS on the backend to allow `https://peesandqueues.app`.

---

## 5. Custom domain (peesandqueues.app)

### Frontend (Vercel)

1. **Vercel project → Settings → Domains.**
2. Add `peesandqueues.app` and `www.peesandqueues.app` (if you want www).
3. Vercel will show DNS records (e.g. A record or CNAME). In your domain registrar (where you bought peesandqueues.app):
   - Add the A record or CNAME Vercel gives you for the root and/or www.
4. Wait for DNS; Vercel will issue HTTPS automatically.

### Backend (optional but nice)

If you want **https://api.peesandqueues.app** instead of the Render URL:

1. **Render:** Web Service → **Settings → Custom Domain** → add `api.peesandqueues.app`.
2. Render will tell you which CNAME to use (e.g. `peesandqueues-api.onrender.com`).
3. At your DNS provider, add a CNAME: `api` → that hostname.
4. After DNS propagates, set **PUBLIC_ORIGIN** on Render to `https://peesandqueues.app` (your app URL) and use `https://api.peesandqueues.app` for the Twilio webhook and for `VITE_API_URL` (if you use Option B above). If you use Vercel rewrites (Option A), point the rewrites to `https://api.peesandqueues.app` instead of the raw Render URL.

---

## 6. Reminder job (30‑minute SMS)

The app has an endpoint that sends reminder SMS to people who have been “active” in a bathroom for more than 30 minutes:  
`POST /api/cron/reminders`  
with header `Authorization: Bearer YOUR_CRON_SECRET`.

**Options:**

- **Render Cron Job:** If you’re on a paid plan, add a **Cron Job** that hits this URL every 5–10 minutes (e.g. `curl -X POST https://api.peesandqueues.app/api/cron/reminders -H "Authorization: Bearer YOUR_CRON_SECRET"`).
- **External cron:** Use [cron-job.org](https://cron-job.org), GitHub Actions, or another scheduler to POST to that URL on a schedule.
- **No cron:** The rest of the app works; only the “still in bathroom?” reminder won’t run until you add one of the above.

---

## 7. Checklist before going live

- [ ] Supabase migration run; tables visible.
- [ ] Render backend deployed; env vars set (including `PUBLIC_ORIGIN` and Twilio).
- [ ] Twilio webhook URL set to your Render (or api.peesandqueues.app) `/webhooks/twilio/sms`.
- [ ] Vercel frontend deployed; rewrites for `/api` and `/webhooks` to backend (or `VITE_API_URL` + CORS).
- [ ] Domain peesandqueues.app (and www if desired) on Vercel; DNS updated.
- [ ] Optional: api.peesandqueues.app on Render; DNS and webhook updated.
- [ ] Optional: Cron hitting `/api/cron/reminders` with `CRON_SECRET`.

---

## 8. Adding Stripe later

When you’re ready for payments (e.g. premium trips, paid features):

- **Backend (Render):** Add Stripe server-side only. Use **Stripe API secret key** in env (e.g. `STRIPE_SECRET_KEY`). Create products/prices in Stripe Dashboard; create Checkout sessions or Payment Intents in your Fastify routes. Never expose the secret key to the frontend.
- **Frontend (Vercel):** Use Stripe.js and **publishable key** only. Call your backend to create a session or PaymentIntent; redirect to Checkout or confirm with Stripe.js.
- **Webhooks:** Stripe needs a **webhook endpoint** (e.g. `https://api.peesandqueues.app/webhooks/stripe`) to receive `checkout.session.completed`, `payment_intent.succeeded`, etc. Add a route in the backend, verify signature with `STRIPE_WEBHOOK_SECRET`, then update your DB or trigger the right logic.

Keeping payment logic and secrets on Render (backend) and only using the publishable key and redirects on Vercel keeps the setup secure and fits your current split.

---

## Quick reference

| What            | Where / URL |
|-----------------|-------------|
| App             | https://peesandqueues.app (Vercel) |
| API             | https://api.peesandqueues.app or Render URL (Render) |
| Twilio webhook  | `https://<API_HOST>/webhooks/twilio/sms` |
| Cron reminder   | `POST <API_HOST>/api/cron/reminders` + Bearer token |
| DB              | Supabase (run migration once) |
| Payments later  | Stripe: secret key on Render, webhook on API, publishable key on frontend |
