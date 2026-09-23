# Build Plan: MVP to Scale

Companion to [`strategy.md`](./strategy.md). This covers what to build, in what order, and the rules the platform enforces.

**Guiding principle:** the MVP is a **trust and operations platform with a bidding engine attached**, not the other way round. Most of the build effort goes into consignment intake, authentication reports, KYC, deposits, settlement and the admin back office.

---

## 1. Phased roadmap

| Phase | Timing (from kickoff) | Goal | Exit criteria |
|---|---|---|---|
| **0: Validate & set up** | Weeks 0–6 | Legal/tax answers, first consignments, manual pilot sales | Tax opinion on s.236A/6A in hand; 30+ lots signed; 2 pilot sales run; bank client-money account open |
| **1: MVP build** | Weeks 3–14 (overlaps with Phase 0) | Timed online auctions for watches and cars, with KYC, deposits, settlement and admin | Private beta with pilot bidders, no P1 bugs, then flagship launch sale |
| **2: Grow** | Months 4–9 | Weekly cadence, collectibles subcategories, live-stream auctions, diaspora bidders, payment automation | Sell-through >70%, ≥4 qualified bidders per lot, non-payment <2% |
| **3: Expand** | Months 9–18 | B2B auction-as-a-service (banks, leasing, insurers, corporates), cross-border buyers, valuation and data products, private sales desk | Second revenue line live |

### Phase 0: Validate & set up (no custom software needed)
- [ ] Incorporate a private limited company with SECP; open a business account and a **segregated client-money account**.
- [ ] Get a **tax opinion** on s.236A (advance tax on auction sales), s.6A (e-commerce withholding), provincial sales tax on commissions, and the agent-vs-principal structure.
- [ ] Get a **legal opinion** on holding buyer funds as collecting agent vs. SBP payment-services licensing, T&Cs under Sale of Goods Act s.64, and AML/DNFBP applicability.
- [ ] Draft consignor agreement, bidder terms, authenticity guarantee, privacy policy and prohibited-items list.
- [ ] Recruit the lead watch specialist and a watchmaker; sign a car inspection partner in the launch city.
- [ ] Sign 30–50 founding consignments.
- [ ] Run **2–3 invitation-only pilot sales** on a simple landing page plus WhatsApp, with manual deposits, bids taken by phone/WhatsApp and recorded by staff, and manual settlement. Record the numbers: bidders per lot, deposit conversion, hammer vs. dealer offer.
- [ ] Get quotes for goods-in-custody and in-transit insurance.
- [ ] Choose the brand name and domains.

### Phase 1: MVP scope

**In scope**
- Public site: home, auction calendar, category pages, **lot page** (gallery, video, condition grade, inspection/authentication report, specs, live bid panel, bid history, Q&A comments, countdown), results archive, "How it works", fees, guarantee, FAQs.
- Accounts: phone OTP sign-up, email, profile, **KYC submission** (CNIC front/back + selfie), bidder status.
- **Deposits:** buyer requests a bid limit, pays the deposit by Raast/IBFT, admin confirms receipt, and the bid limit is activated. Deposits are refunded after auctions the buyer does not win.
- **Bidding engine:** proxy bidding, increments, reserve, soft close, realtime updates, bid limits, full audit trail.
- **Post-auction:** winner invoice, payment instructions, payment confirmation by admin, handover scheduling, seller settlement statement, payout record. **Make-offer window** for lots that miss reserve.
- **Consignor portal (lite):** submit an item for consideration (photos + details), see status, see their live lots and results.
- **Admin back office:** consignment pipeline, item intake, inspection/authentication report builder, lot cataloguing and scheduling, KYC review queue, deposits ledger, invoices and payments reconciliation, settlements, disputes, user bans, shill-risk flags, comment moderation.
- **Notifications:** WhatsApp (template messages), SMS fallback and email for: outbid, ending soon (watchlist), won, payment due, payment received, handover, payout.
- **Watchlist**, saved searches (basic).
- Price display in PKR with a **lakh/crore toggle** (e.g. "PKR 2.5 crore" vs. "PKR 25,000,000").

**Out of scope for MVP (Phase 2+):** native mobile apps (ship a PWA first), live-stream auctions, automated payment gateway reconciliation, NADRA Verisys automation, multi-currency and diaspora payments, shipping integrations, sealed-bid format, B2B seller self-service.

---

## 2. Auction rules (platform policy, enforced in code)

| Rule | Setting at launch |
|---|---|
| Format | Timed English (ascending) auction with proxy bidding |
| Duration | 7 days (cars, watches); 5–7 days (collectibles) |
| End times | Evenings Pakistan time, staggered ~2 min apart within a sale |
| Soft close | Any bid in the final **2 minutes** resets the end to now + 2 minutes |
| Reserve | Hidden; UI shows "Reserve not met" or "Reserve met". "No Reserve" lots flagged prominently. |
| Minimum bid | Starting bid set by us with the consignor; then the current price plus the increment |
| Bid retraction | Not permitted, except an obvious-error correction approved by an admin within 10 minutes, logged |
| Seller bidding | **Prohibited** (no disclosed right to bid is reserved). Seller-linked accounts are blocked from their own lots. |
| Bid limit | Bidder's max bid ≤ approved bid limit (tied to deposit) |
| Deposit | 5% of the requested bid limit, minimum PKR 50,000 **(calibrate after pilots)** |
| Winner payment | Full payment within **3 business days** of close. Default means deposit forfeiture and account suspension; lot offered to the underbidder. |
| Outage policy | Platform outage or declared national connectivity disruption means affected lots are extended by an admin action, broadcast via SMS and WhatsApp |
| Post-auction offers | Reserve-not-met lots open a 48h window where the high bidder and others may submit offers for the consignor |
| Authenticity guarantee | Refund if an item is proven not authentic or materially misdescribed. Claim window: watches and collectibles 12 months; cars per inspection terms at handover. |

**Bid increments (PKR):**

| Current price | Increment |
|---|---|
| < 50,000 | 1,000 |
| 50,000 – 199,999 | 2,500 |
| 200,000 – 499,999 | 5,000 |
| 500,000 – 999,999 | 10,000 |
| 1,000,000 – 2,499,999 | 25,000 |
| 2,500,000 – 4,999,999 | 50,000 |
| 5,000,000 – 9,999,999 | 100,000 |
| 10,000,000 – 24,999,999 | 250,000 |
| 25,000,000 – 49,999,999 | 500,000 |
| ≥ 50,000,000 | 1,000,000 |

---

## 3. Architecture

### Recommended stack
Optimised for a small team shipping fast, with correctness where it matters (bids and money).

| Layer | Choice | Why |
|---|---|---|
| Web app | **Next.js (TypeScript)**, server-rendered lot and results pages, PWA | SEO for lots and results; one codebase for public, portal and admin |
| Database | **PostgreSQL** (managed, e.g. Supabase) | Transactions and row locks make the bid engine simple and correct at our scale |
| Auth | Phone OTP + email (Supabase Auth or equivalent); **mandatory 2FA for staff** | Phone is the primary identity in Pakistan |
| Realtime | Postgres change feed / websocket channel per lot (Supabase Realtime or equivalent) | Live price, leader and end-time updates |
| Media | Object storage + image CDN; video via a streaming provider | 100+ photos per car; walkaround and cold-start videos |
| Jobs | Scheduled workers (e.g. pg_cron or a queue) | Lot closing, reminders, deposit refunds, notification fan-out |
| Notifications | WhatsApp Business Platform (Meta Cloud API), SMS gateway, transactional email | WhatsApp is the primary channel in Pakistan |
| Hosting | Vercel (web) + managed Postgres | Minimal ops |
| Observability | Error tracking, uptime monitoring on bid endpoints, DB audit log | We must be able to prove what happened in any dispute |

The team already has Vercel and Supabase connectors set up, so this stack has the least friction. Nothing here locks us in; it is standard Postgres plus Next.js.

### Bid engine design
Correctness requirements: no two bids can both "win" a race, server time is the only clock, every state change is auditable, and the result is reproducible from the bid log.

`place_bid(lot_id, bidder_id, max_amount, idempotency_key)` is implemented as **one database transaction** (a Postgres function called via RPC):

```text
BEGIN
  lot := SELECT ... FROM lots WHERE id = lot_id FOR UPDATE      -- serialises bids per lot
  now := server clock (transaction timestamp)

  reject if lot.status != 'live' OR now >= lot.ends_at
  reject if bidder not KYC-approved, suspended, or linked to the consignor
  reject if max_amount > bidder.bid_limit (minus committed exposure, if we enforce exposure across lots)
  reject if idempotency_key already used (return the original result)

  min_ok := lot.leader_id IS NULL ? lot.starting_price
                                  : lot.current_price + increment(lot.current_price)

  IF bidder = lot.leader_id:                       -- leader raising their own max
      reject if max_amount <= lot.leader_max
      lot.leader_max := max_amount
  ELSE:
      reject if max_amount < min_ok
      IF lot.leader_id IS NULL:
          leader := bidder; leader_max := max_amount; price := lot.starting_price
      ELSE IF max_amount > lot.leader_max:         -- new leader
          price  := min(max_amount, lot.leader_max + increment(lot.leader_max))
          leader := bidder; leader_max := max_amount
          record auto-bid for previous leader at their max
      ELSE:                                        -- existing leader's proxy defends (ties go to the earlier bid)
          price := min(lot.leader_max, max_amount + increment(max_amount))
          record the challenger's bid, then the proxy bid for the leader at price

  IF lot.reserve IS NOT NULL AND leader_max >= lot.reserve AND price < lot.reserve:
      price := lot.reserve                         -- jump to reserve once someone's max covers it

  IF lot.ends_at - now < interval '2 minutes':
      lot.ends_at := now + interval '2 minutes'    -- soft close

  INSERT bid rows (append-only, with visible amount, max (private), timestamps, ip/device hash)
  UPDATE lot (current_price, leader_id, leader_max, ends_at, bid_count)
COMMIT
→ broadcast {lot_id, current_price, leader_handle, ends_at, reserve_met, bid_count}
```

- **Closing:** a lot is closed when `now >= ends_at`. Bids are rejected against the locked row, so correctness does not depend on the closing job's timing. The job only finalises the outcome (sold/unsold), creates the invoice, notifies, and schedules deposit refunds.
- **Testing:** unit tests for increments and proxy scenarios; a **concurrency test** firing hundreds of simultaneous bids at one lot to prove a single consistent outcome; replay tests that recompute every lot's result from the bid log.
- **Scale:** Pakistani luxury auctions will see tens to hundreds of concurrent bidders per lot at peak. A per-lot row lock on Postgres handles this comfortably. Don't over-engineer.

### Core data model (initial)

```text
users               id, phone, email, handle, role(bidder|consignor|staff|admin), status, created_at
kyc_verifications   user_id, cnic_number(encrypted), cnic_images, selfie, status, reviewed_by, reviewed_at, notes
deposits            id, user_id, amount, method(raast|ibft|pay_order), reference, status(pending|confirmed|refunded|forfeited), confirmed_by
bid_limits          user_id, limit_amount, basis_deposit_id, effective_from

consignors          id, user_id, payout_account(encrypted), agreement_signed_at
items               id, consignor_id, category(watch|car|collectible), subcategory, title, attributes(jsonb), provenance, status
inspections         id, item_id, type(authentication|mechanical|title_check), inspector, grade, report(jsonb), documents, passed, date
media               id, item_id, kind(photo|video|document), url, order, exif_stripped

sales               id, title, category, starts_at, base_ends_at, type(timed|live|hybrid), status
lots                id, sale_id, item_id, lot_number, starting_price, reserve(private), status(draft|scheduled|live|closed|sold|unsold|offer_window),
                    current_price, leader_id, leader_max(private), ends_at, bid_count, buyer_premium_rule, seller_fee_rule
bids                id, lot_id, bidder_id, amount, max_amount(private), kind(manual|proxy), created_at, ip_hash, device_hash   -- append-only
watchlists          user_id, lot_id
comments            id, lot_id, user_id, body, is_seller_reply, status(visible|hidden)
offers              id, lot_id, user_id, amount, status

invoices            id, lot_id, buyer_id, hammer, buyer_premium, taxes, total, due_at, status
payments            id, invoice_id, amount, method, reference, received_at, confirmed_by
handovers           id, lot_id, scheduled_at, location_id, buyer_ack_at, seller_ack_at, notes
settlements         id, lot_id, consignor_id, hammer, seller_fee, withholdings, net_payout, paid_at, reference
disputes            id, lot_id, raised_by, type, status, resolution

risk_flags          id, subject(user|lot|bid), rule, score, status          -- shill/collusion signals
audit_log           id, actor_id, action, entity, entity_id, before, after, created_at  -- append-only
```

Access rules: row-level security so `reserve`, `leader_max`, bidders' max amounts, KYC data and payout details are never readable by the public or by other users. Staff access to CNIC data is logged.

### Trust & safety features in MVP
- **KYC:** phone OTP, CNIC images and selfie, manual review in the admin queue (automate with NADRA Verisys through a licensed provider or bank partner in Phase 2).
- **Seller–bidder separation:** block bids from the consignor account and any account sharing their phone, CNIC, payout account or device fingerprint.
- **Shill and collusion signals (flag for review, don't auto-ban):** repeated bidding on one consignor's lots without winning; bids that stop just under the reserve; shared IP/device clusters; new accounts bidding only on one seller; retracted-then-rebid patterns.
- **Privacy:** public handles only; no seller or buyer names or locations; EXIF/GPS stripped from all uploads.
- **Admin security:** 2FA, least-privilege roles, audit log on every money and status change.

---

## 4. Phase 1 sprint plan (2-week sprints)

| Sprint | Weeks | Deliverables |
|---|---|---|
| S1: Foundations | 3–4 | Repo, CI, environments, design system, auth (phone OTP), user profiles, KYC upload + admin review queue, audit log |
| S2: Catalogue | 5–6 | Consignment intake, items, inspection/authentication report builder, media pipeline (EXIF strip, CDN), sales and lots, public lot and sale pages, SEO |
| S3: Bidding | 7–8 | Deposits ledger + bid limits, `place_bid` engine with proxy/reserve/soft close, realtime updates, bid history, concurrency tests |
| S4: Close-out | 9–10 | Closing job, invoices, manual payment reconciliation, handover scheduling, settlements, make-offer window, WhatsApp/SMS/email notifications, Q&A comments + moderation |
| S5: Hardening | 11–12 | Results archive, watchlist, consignor portal lite, risk flags, admin reports, load test, security review, T&Cs wired into sign-up and bid confirmation |
| Beta | 13–14 | Private beta with pilot bidders and founding consignors, fixes, then the **flagship launch sale** |

---

## 5. Phase 2–3 backlog (prioritise after launch data)

**Phase 2**
- Live-stream auction mode (host console, lot queue, ~30–90s lots) for collectibles.
- Raast Request-to-Pay and payment-gateway integration for automated reconciliation.
- NADRA Verisys automated KYC.
- Diaspora bidders: foreign-number OTP, passport + NICOP KYC, Roshan Digital Account / remittance payment flows (after FX counsel).
- Collectibles subcategories with expert templates (art, coins/banknotes, memorabilia).
- Consignor self-serve estimates and valuation requests.
- Native app wrappers if PWA engagement warrants.
- Public price guides built from our results database.

**Phase 3**
- **Auction-as-a-service for institutions:** multi-tenant seller accounts for banks, leasing companies, insurers (salvage) and corporate fleets; sealed-bid/tender format; bulk lot upload; institution-branded sale pages. Check how s.236A applies to institutional sellers.
- Cross-border buyers (GCC first): export documentation for watches and collectibles, insured international shipping.
- Private sales desk tooling.
- Financing partners (e.g. Islamic auto financing) integrated into car checkout.
- Valuation reports for insurance, estates and banks, using our results data.

---

## 6. Team (first 12 months)

| Role | When | Notes |
|---|---|---|
| Founder / CEO | Now | Owns consignments (network), partnerships, fundraising |
| Head of Operations & Trust | Phase 0 | Owns intake, KYC, deposits, settlement, handovers, disputes, AML programme |
| Lead Watch Specialist (+ contracted watchmaker) | Phase 0 | Authentication standards, grading, cataloguing |
| Car Specialist / inspection partner | Phase 0 | Title checklist, inspections, listing content |
| Engineers ×2 (full-stack) | Phase 1 | Or 1 senior + a vetted agency; the bid engine and payments stay in-house |
| Product designer (contract) | Phase 1 | Lot page, bid flow, admin UX |
| Content lead (photo/video) | Phase 1 | Studio photography, walkarounds, social |
| Marketing & community | Pre-launch | Collectors, clubs, dealers, diaspora, events |
| Finance & compliance (part-time) + legal/tax retainer | Phase 0 | Client-money reconciliation, tax filings, AML |

---

## 7. Launch readiness checklist

- [ ] Tax opinion received and fee/invoice structure updated accordingly
- [ ] Client-money account live; reconciliation SOP written and rehearsed
- [ ] Bidder terms, consignor agreement, guarantee, privacy and prohibited-items pages published
- [ ] AML programme: KYC SOP, source-of-funds threshold, no-cash policy, STR escalation path
- [ ] Authentication SOP (watches) and title/inspection checklist (cars) signed off by specialists
- [ ] Insurance bound (custody, transit, professional liability)
- [ ] Secure handover room ready; staff security protocol
- [ ] Bid engine concurrency and replay tests passing; load test at 10× expected peak
- [ ] Outage-extension runbook; SMS/WhatsApp broadcast tested
- [ ] 40 flagship lots catalogued, reviewed and scheduled; 100+ pre-registered bidders with deposits
