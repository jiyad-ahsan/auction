# Watches MVP

This narrows [`build-plan.md`](./build-plan.md) to **luxury watches only**: the smallest thing we can use to run real auctions with real money. It covers what's built, how to run it, how the team operates it, and what's left before the first public sale.

## What the MVP does

| Area | Built |
|---|---|
| **Catalogue** | Home (live and upcoming lots), lot page (photos, specs, authentication and condition report, guarantee), results archive, how-it-works/fees/increments page |
| **Bidders** | Phone OTP sign-in, public handle (names never shown), CNIC submission (encrypted at rest), deposit submission (Raast / IBFT / pay order reference), bid limit and available limit, my bids (leading/outbid/won), purchases with payment instructions |
| **Bidding** | Proxy (max) bidding, PKR increment table, hidden reserve with a "reserve met" flag, 2-minute soft close, bid limit enforced across **all** lots a bidder leads plus unpaid invoices, consignors blocked from their own lots, idempotent retries, append-only bid log, live updates by polling (every 1.5s in the last 5 minutes) |
| **Sellers** | "Sell a watch" enquiry form feeding the admin queue |
| **Admin** | Operations dashboard (queues, GMV, sell-through); consignment enquiries; watch intake with consignor; photos; **authentication report builder** (grade S–D, timegrapher, parts, checklist); lot creation (drafts or publish; PKT times); lot list with private reserve and leader max; outage extension; KYC review (CNIC reveal is audit-logged) and suspend; deposits (confirm / reject / refund / forfeit, with bid limit recalculated); invoices (mark paid, collected, default, which suspends the buyer and voids the payout); consignor payouts (blocked until the buyer has paid **and** collected) |
| **Closing** | `close_due_lots()` finalises lots, creates the invoice (hammer + 7.5% premium, min PKR 15k) and settlement (5% seller fee), and notifies winners once |
| **Audit** | Every admin money, status and KYC action is written to `audit_log` |

**Fees and rules** follow `strategy.md` §5.6 and `build-plan.md` §2: buyer's premium 7.5% (min PKR 15,000), seller commission 5%, deposit = 5% of bid limit (min PKR 50,000), payment within 3 days.

## Running it locally

Requires Node 22+ and PostgreSQL 14+.

```bash
npm install
cp .env.example .env.local        # then set APP_ENCRYPTION_KEY (openssl rand -base64 32) and SESSION_SECRET
createdb auction && createdb auction_test
npm run db:migrate
npm run db:seed                   # sample watches, bidders and bids (dev only)
npm run dev                       # http://localhost:3000
```

- **Signing in:** OTP codes are printed in the server log (`NOTIFY_PROVIDER=console`). The number in `ADMIN_PHONES` becomes an admin on first sign-in (the seed uses `+923000000000`, i.e. enter `0300 0000000`).
- **Closing lots:** call `GET /api/cron/close-lots` with `Authorization: Bearer $CRON_SECRET` every minute, or `npm run db:close-lots`. There is also a button on Admin → Lots. Bidding correctness doesn't depend on this job; bids after `ends_at` are always rejected.
- **Tests:** `npm test`. Integration tests run against `TEST_DATABASE_URL` and **wipe it**. They cover proxy logic, ties, increments, reserve jumps, soft close, KYC/suspension/seller blocks, cross-lot bid limits, idempotency, 60 concurrent bids on one lot, closing/invoicing maths, append-only bids, and SQL/TS increment parity.

### Layout

```text
db/migrations/        001_schema.sql (tables), 002_bidding.sql (place_bid, close_due_lots, limits)
scripts/              migrate, seed, close-lots
src/lib/              db, auth (OTP + sessions), bidding, closing, lots/lotState (public projections), money, crypto, notify, time
src/app/              public pages, account, consign, api/lots/[id] (state + bid), api/cron/close-lots, admin/*
src/components/       BidPanel (live bidding), LotCard, Countdown
tests/                money + bid engine integration tests
```

**Design notes**
- **The bid engine is a single Postgres function** (`place_bid`) that locks the lot row, so there are no race conditions and there's one source of truth. The TypeScript side only maps errors to messages and sends notifications.
- **Private fields** (reserve, leader max, bidder maxes, serials, CNIC, consignor identity) are never selected into public queries (`src/lib/lots.ts`).
- **Plain Postgres + Next.js:** it deploys to Vercel with Supabase (or any managed Postgres) without code changes.

## Operating runbook (pilot)

1. **Intake:** a consignment enquiry arrives → a specialist calls within one business day → the watch is received at the viewing room → Admin → Watches → *Intake a watch*.
2. **Authenticate:** open the case, check movement/serial/reference, timegrapher reading, stolen-register check → fill in the report → verdict *authentic* moves the watch to `approved`. Anything inconclusive is returned to the consignor.
3. **Catalogue:** studio photos only (strip EXIF/GPS, never at the consignor's home) → add image URLs → write the description.
4. **Schedule:** create the lot with starting price and reserve (agreed in writing with the consignor), 7 days, ending in the evening PKT, staggered a few minutes apart.
5. **Bidders:**
   - KYC: check each CNIC against NADRA (via the bank partner or e-Sahulat), and add a WhatsApp video check for limits above PKR 5M.
   - Deposits: confirm only against the client-account bank statement.
6. **Close:** the winner is notified automatically → confirm the payment on the statement → mark paid → book the handover (buyer inspects, signs) → mark collected → pay the consignor and record the transfer reference.
7. **Defaults:** after 3 days unpaid, mark defaulted (suspends the buyer) → forfeit their deposit on the Deposits page → offer the watch to the underbidder or relist.
8. **Refunds:** on request, mark the deposit refunded after sending it back. The system blocks refunds that would leave open bids or unpaid invoices uncovered.

## Before the first public sale

**Blocking**
- [ ] **Legal and tax:** s.236A / s.6A opinion; invoice tax lines (the invoice currently shows hammer + premium only); lawyer-drafted bidder terms, consignor agreement and privacy policy linked at sign-up and bid confirmation.
- [ ] **WhatsApp/SMS provider:** implement the `Notifier` in `src/lib/notify.ts` with approved WhatsApp templates (OTP, outbid, won, payment received, payout) and SMS fallback.
- [ ] **Photo upload:** direct upload to object storage (e.g. Supabase Storage or S3) with server-side EXIF stripping, replacing pasted URLs.
- [ ] **KYC evidence:** CNIC front/back and selfie upload to private storage (currently manual verification only). NADRA Verisys integration later.
- [ ] **Hosting:**
  - Managed Postgres in a region close to Pakistan (e.g. Mumbai or Middle East).
  - A scheduler hitting `/api/cron/close-lots` every minute. Vercel's per-minute crons need a paid plan; alternatives are pg_cron or an external scheduler.
  - Backups and error monitoring.
- [ ] **Security pass:** rate-limit the bid and OTP endpoints per IP; 2FA for staff; review admin roles (`staff` vs `admin`).

**Soon after**
- [ ] Shill/collusion risk flags (shared device/IP, bidding only on one consignor's lots).
- [ ] Post-auction offers for reserve-not-met lots.
- [ ] Watchlist and "ending soon" reminders.
- [ ] Self-serve deposit refund requests.
- [ ] Consignor portal showing their lots and payouts.
- [ ] Urdu for notifications and key flows.

## Timeline to first sale

| Week | Work |
|---|---|
| 1–2 | Legal/tax opinions started; client-money account opened; watch specialist and watchmaker signed; 20–30 founding watches consigned |
| 2–4 | Blocking items above (notifications, uploads, KYC evidence, hosting, security) |
| 3–5 | Authenticate and photograph the first 20 lots; register and verify 50–100 bidders through the network |
| 5–6 | **Invitation-only pilot sale** (10–20 watches) on the live system; measure bidders per lot, deposit conversion, hammer vs. dealer offers |
| 7–8 | Fix what the pilot shows, then the **public launch sale** (~30–40 watches) with a viewing event |
