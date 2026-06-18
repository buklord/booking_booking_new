# Driving Date Search

A high-performance monorepo for finding **UK driving test cancellations** (a "Testi"-style app). It watches DVSA test centres for earlier slots and pushes a notification to your phone the moment one appears.

```
.
├── mobile/      # React Native (Expo) app - login, dashboard, settings/premium
├── backend/     # Node.js / Express API - users, test centres, slots, FCM push
├── scraper/     # Python + Playwright - checks DVSA centres every 60s
└── database/    # Supabase / PostgreSQL schema (paste into the SQL editor)
```

### How it fits together

```
 ┌──────────┐   register / settings   ┌───────────┐   read jobs / report slots   ┌──────────┐
 │  mobile  │ ──────────────────────▶ │  backend  │ ◀─────────────────────────── │ scraper  │
 │ (Expo)   │ ◀───────────────────── │ (Express) │ ───────── FCM push ─────────▶ │(Playwright)│
 └──────────┘     slots / push        └─────┬─────┘                              └──────────┘
                                            │
                                      ┌─────▼─────┐
                                      │ Supabase  │
                                      │ Postgres  │
                                      └───────────┘
```

1. The **mobile app** registers the user (email + DVSA login + current test date) and their watched test centres, and uploads its push token.
2. The **scraper** asks the backend for "jobs" (users + active centres + decrypted DVSA credentials), checks each centre, and reports any slots it finds.
3. The **backend** stores slots in Supabase and sends an **FCM push** for any slot earlier than the user's current booked date.

---

## ⚠️ Legal / DVSA Terms of Use

Automating logins to or scraping of the DVSA booking website is **against DVSA's terms of use**, and DVSA actively deploys anti-bot protection (queueing, Imperva/Incapsula, CAPTCHAs). The selectors in `scraper/dvsa_scraper.py` are **placeholders** and will need ongoing maintenance plus bot-mitigation handling to work against the live site. A **mock DVSA site** is bundled (`scraper/mock_site/`) so you can develop and test everything locally without touching DVSA. Running this against the real site is **at your own risk**.

---

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- A free **Supabase** project (Postgres)
- A **Firebase** project (for Cloud Messaging / push)
- (Optional) A **Stripe** account — the premium upgrade is currently mocked

---

## 1. Database (Supabase)

> 💡 You can do this first, before the rest of the code is finished.

1. Create a project at [supabase.com](https://supabase.com) (the free **Spark/Free** tier is fine).
2. Open **SQL Editor → New query**.
3. Paste the entire contents of [`database/schema.sql`](database/schema.sql) and click **Run**.
4. Grab these from **Project Settings → API**:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role secret — backend only, never ship to the app)

This creates three tables: `users`, `test_centres`, `available_slots`.

---

## 2. Backend (Node / Express)

```bash
cd backend
cp .env.example .env        # then fill in the values below
npm install
npm run dev                 # http://localhost:4000  (health: /health)
```

`backend/.env`:

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `PORT` | API port (default 4000) | — |
| `SUPABASE_URL` | Supabase project URL | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Supabase → Settings → API |
| `CREDENTIALS_ENCRYPTION_KEY` | 32-byte hex key to encrypt DVSA passwords | run `openssl rand -hex 32` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON | Firebase → Project settings → Service accounts → Generate new private key |
| `STRIPE_SECRET_KEY` | Stripe secret (premium, mocked) | Stripe dashboard → Developers → API keys |
| `STRIPE_PRICE_ID` | Stripe price for premium (mocked) | Stripe dashboard → Products |
| `SCRAPER_API_KEY` | Shared secret the scraper uses | choose any random string |

> Put the Firebase service account JSON file somewhere the backend can read (e.g. `backend/firebase-service-account.json`) and point `GOOGLE_APPLICATION_CREDENTIALS` at it. It is git-ignored.

### API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/api/users` | Create/update user (login) |
| `GET` | `/api/users/:id` | Get user |
| `PUT` | `/api/users/:id/device-token` | Save push token |
| `GET/POST` | `/api/test-centres` | List / add watched centres |
| `PUT/DELETE` | `/api/test-centres/:id` | Update / remove centre |
| `GET` | `/api/slots?user_id=` | List found slots |
| `POST` | `/api/slots/report` | **(scraper)** report found slots |
| `GET` | `/api/scraper/jobs` | **(scraper)** fetch watch jobs |
| `POST` | `/api/billing/mock-upgrade` | Mock premium upgrade |

Scraper endpoints require the `x-scraper-key: <SCRAPER_API_KEY>` header.

Run backend tests / lint:

```bash
npm test
npm run lint
```

---

## 3. Scraper (Python + Playwright)

```bash
cd scraper
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env        # then fill in the values below
```

`scraper/.env`:

| Variable | What it is |
| --- | --- |
| `BACKEND_URL` | Backend base URL (default `http://localhost:4000`) |
| `SCRAPER_API_KEY` | Must match the backend's `SCRAPER_API_KEY` |
| `DVSA_LOGIN_URL` | DVSA login URL (configurable) |
| `POLL_INTERVAL_SECONDS` | How often to check (default `60`) |
| `HEADLESS` | Run browser headless (`true`/`false`) |
| `USE_MOCK` | `true` → scrape the bundled mock site (recommended for dev) |
| `MOCK_URL` | Mock site URL (default `http://localhost:8000`) |

### Run it locally against the mock site

```bash
# terminal 1 - mock DVSA site
python mock_site/server.py

# terminal 2 - the scraper loop
USE_MOCK=true python main.py
```

The scraper polls the backend for jobs, "checks" each centre, and reports slots. With `USE_MOCK=false` it will use the placeholder DVSA login/scrape flow (see the legal note above).

---

## 4. Mobile app (React Native / Expo)

```bash
cd mobile
npm install
npx expo start
```

- Press `a` (Android), `i` (iOS), or scan the QR code with **Expo Go**.
- On a **physical device**, set the API URL to your machine's LAN IP (not `localhost`):
  - edit `app.json → expo.extra.apiUrl`, or set `EXPO_PUBLIC_API_URL` before starting.

Screens:
- **Login** — email, DVSA credentials, current test date.
- **Dashboard** — current test date vs found cancellations (pull to refresh; "Earlier!" tag for better slots).
- **Settings** — manage watched test centres + **Upgrade to Premium** (mock purchase button).

### Push notifications (FCM)

Push uses `expo-notifications`, which delivers via **FCM** on Android. For real delivery:
1. In Firebase, add an Android app and download `google-services.json` into `mobile/`.
2. Generate a service account key (Firebase → Project settings → Service accounts) and point the **backend's** `GOOGLE_APPLICATION_CREDENTIALS` at it.
3. The app uploads its device token to `PUT /api/users/:id/device-token`; the backend sends pushes from `POST /api/slots/report`.

---

## Recommended local run order

1. Run the SQL schema in Supabase.
2. Start the **backend** (`npm run dev`).
3. Start the **mock site** and the **scraper** (`USE_MOCK=true`).
4. Start the **mobile app** (`npx expo start`), register, add a couple of test centres.
5. Watch the dashboard populate and (on a real Android device with FCM configured) receive a push.

## Environment variable checklist

- **Supabase:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Firebase:** `GOOGLE_APPLICATION_CREDENTIALS` (backend), `google-services.json` (mobile)
- **Stripe (mocked):** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`
- **Encryption:** `CREDENTIALS_ENCRYPTION_KEY`
- **Scraper auth:** `SCRAPER_API_KEY` (same value in `backend/.env` and `scraper/.env`)

Never commit `.env` files or service account keys — they are git-ignored.
