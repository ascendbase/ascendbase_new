# AscendBase — crypto-gated educational site

A clean, modern (iOS 27 black / white / transparent + red) website where access is
**paid only**, bought with **self-custody crypto from any wallet**, on a **subscription basis**. Members get
a gated content vault and a **personal support inbox** you answer from an admin panel.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS v4**, **Turso (libSQL)**
for the database, and runs great on **Vercel**.

---

## Features
- **Lead / landing page** — benefits, how-it-works, personal-support pitch, sign-up CTA.
- **Sign up + log in** (email + password, session cookies).
- **Self-custody crypto checkout** — shows your wallet address; you verify the transfer, then access opens.
- **Gated content vault** — only visible to members with an active subscription.
- **Personal support inbox** — members message you; you reply from the admin panel.
- **Admin panel** — publish/edit/delete content (block editor: text + inline images), answer support,
  manage users (grant / revoke access).
- **Sandbox mode** — runs with zero crypto setup; a "Simulate payment" button stands in
  so you can exercise the whole flow locally.

## Subscription model
Crypto has no native auto-recurring billing, so the flow is:
**one-time payment → fixed access period (default 30 days) → re-pay to extend.**
`ACCESS_DAYS` controls the window. Flip it to a different model later if you like.

---

## Local development
```bash
npm install
cp .env.example .env.local      # then edit values (see below)
npm run dev                     # http://localhost:3000
```
On first run a local SQLite file (`local.db`) is created and an admin account is seeded
from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Use those to log in and reach `/admin`.

**Sandbox (default):** with no `RECEIVE_ADDRESS` set, checkout is mocked. At checkout click
**"Simulate payment (sandbox)"** to open the vault.

---

## Crypto receiving (self-custody, no processor / no KYC)
You receive payments directly to YOUR OWN wallet — no Bybit account, no merchant KYC.
This is the key advantage if you're in a region where payment processors are blocked.

1. Get a deposit address from a wallet you control (e.g. TronLink for USDT-TRC20, or a
   BTC / ETH / SOL wallet).
2. Put it in env (`.env.local` / Vercel):
   - `RECEIVE_ADDRESS` — USDT (TRC20) address  ← minimum to go live
   - `RECEIVE_BTC_ADDRESS`, `RECEIVE_ETH_ADDRESS`, `RECEIVE_SOL_ADDRESS` — optional extras
3. Leave `RECEIVE_ADDRESS` empty → **sandbox mode** (fake address + "Simulate payment"
   button) so you can exercise the whole flow locally with zero setup.
4. Flow: member generates an invoice (address + exact amount + unique reference) → pays
   from ANY wallet → subscription stays `pending` → **you verify the transfer in
   `/admin` → Payments and click "Verify & grant access"** → their access opens.
5. Want it automatic later? Point a processor (NowPayments, or a self-hosted BTCPay
   Server) at `/api/webhooks/payment` and implement `verifyWebhook()` in `lib/payments.ts`.
   The manual verify gate still works as a fallback / override.

> **Why self-custody (and why not a $ processor):** a card/fiat processor (Stripe,
> PayPal, even Bybit) requires a merchant account + identity verification, which is
> blocked for Russian residents. Your own crypto wallet has no such gate — the member
> pays from any wallet, and only you can confirm the transfer. If you later want a fiat
> fallback for EU/US members, a **Kyrgyzstan-issued card** can receive card payments
> where Russian ones can't, but crypto is the simplest zero-KYC path and works globally
> from day one.

---

## Environment variables
| Var | Purpose | Default / note |
|-----|---------|----------------|
| `AUTH_SECRET` | Signs session cookies | set a long random string |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeds the admin account | set for local/dev |
| `APP_URL` | Base URL for payment return/notify links | e.g. `https://you.vercel.app` |
| `TURSO_URL` / `TURSO_AUTH_TOKEN` | DB (leave empty = local `./local.db`) | set both on Vercel (Turso) |
| `RECEIVE_ADDRESS` | Your USDT (TRC20) deposit address | empty = sandbox |
| `RECEIVE_BTC_ADDRESS` / `RECEIVE_ETH_ADDRESS` / `RECEIVE_SOL_ADDRESS` | Optional extra networks | empty = not offered |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage for vault images (prod) | empty = local `public/uploads` |
| `PRICE_USDT` | Price of the access plan (USDT) | `49` |
| `ACCESS_DAYS` | Days of access per payment | `30` |

---

## Deploy to Vercel
1. Push the repo to GitHub.
2. In Vercel: **New Project** → import the repo → Framework **Next.js** (defaults work).
3. Add the env vars above (use your **Turso** `TURSO_URL` + `TURSO_AUTH_TOKEN`, and a `RECEIVE_ADDRESS`
   keys for live mode).
4. Deploy. After the first request the DB tables are created automatically.
5. Log in with your admin credentials → `/admin` to publish content.

---

## Freemium (2-tier) content model
Content posts each have an **access tier** (set in `/admin`):
- **Free** — readable by every signed-up user (no payment).
- **Preview** — free users see a teaser (first blocks), then a "get full access" gate.
- **Paid** — free users see a lock; full content opens only with an active subscription.

Sign-up is **always free**; payment (crypto) only unlocks paid/preview content.
Admins see everything regardless of tier.

---

## Permanent storage — local vs cloud
The app stores two kinds of data, and they behave differently in dev vs prod:

| Data | Local dev | Production (Vercel) |
|------|-----------|----------------------|
| **Text / structure / users / payments** (SQLite) | `local.db` file | **Turso** (hosted libSQL) — set `TURSO_URL` + `TURSO_AUTH_TOKEN` |
| **Vault images** | `public/uploads/` folder | **Vercel Blob** — set `BLOB_READ_WRITE_TOKEN` |

> On Vercel the filesystem is **read-only/ephemeral** — anything written to
> `local.db` or `public/uploads` at runtime **disappears on the next deploy**.
> That's why production MUST use Turso + Vercel Blob. With both env vars set,
> the exact same admin workflow writes straight to permanent cloud storage,
> so content survives forever and across redeploys.

### Setting up permanent storage (one-time)
1. **Database — Turso (free):** create a database at turso.tech → copy the
   `TURSO_URL` (libsql URL) and `TURSO_AUTH_TOKEN` into Vercel env (and your
   local `.env.local` if you want local + prod to share one DB).
2. **Images — Vercel Blob (free tier):** in the Vercel dashboard create a Blob
   store → copy `BLOB_READ_WRITE_TOKEN` into env.
3. Deploy. The first request auto-migrates the Turso schema (tables + columns
   are created/updated by `lib/db.ts` `initDb()`).
4. Log in to `/admin` and fill the vault — content now lives in Turso + Blob.

You can also run the admin locally against the **same Turso DB** (set the Turso
env in `.env.local`) and just deploy the code afterward — there is one source
of truth either way.

---

## Project layout
```
app/
  page.tsx                 landing / lead page
  signup, login            auth
  checkout                 crypto invoice + (sandbox) simulate
  dashboard                gated content vault
  support                  member support inbox
  admin                    content / support / users management
  api/...                  auth, checkout, webhooks/payment, content, support, admin
lib/
  db.ts                    libSQL client + schema + admin seed
  auth.ts                  sessions, bcrypt, helpers
  payments.ts              self-custody invoice + manual verify (sandbox + live)
components/                iOS-style UI primitives + nav
```
