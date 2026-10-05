# Auction: a curated auction house for Pakistan

A trust-first online auction platform for **luxury watches**, **collector and high-end cars**, and selected **collectibles** in Pakistan.

## Watches MVP (the code in this repo)

Nilaam, a working auction platform for authenticated luxury watches. It runs in **pilot mode** by default (invite-only via WhatsApp group links, phone + email verification, staff-set bid limits, CNIC at collection) and keeps custody of every watch and every rupee. It has live proxy bidding with late-bid extensions, tags, and an admin back office for intake, custody, authentication reports, lots, invites, payments and consignor payouts. Next.js + PostgreSQL, light and dark themes.

```bash
npm install && cp .env.example .env.local   # set APP_ENCRYPTION_KEY and SESSION_SECRET
npm run db:migrate && npm run db:seed && npm run dev
npm test
```

See [`docs/watches-mvp.md`](docs/watches-mvp.md) for scope, setup, the operating runbook and the pre-launch checklist.

## Documents

- [`docs/watches-mvp.md`](docs/watches-mvp.md): the watches MVP (what's built, how to run and operate it, what's left before the first sale).

- [`docs/strategy.md`](docs/strategy.md): market landscape, why online auctions haven't caught on, category assessment, international auction models and which to use, feasibility (payments, legal/tax, security, economics), go-to-market, risks, and the decisions the founders need to make.
- [`docs/architecture-review.md`](docs/architecture-review.md): review of Anas's MVP architecture document against what's built, with questions for the founders.
- [`docs/product-page-review.md`](docs/product-page-review.md): review of Anas's lot page prototype: what to adopt, what to change, decisions needed, and a build plan.
- [`docs/build-plan.md`](docs/build-plan.md): phased roadmap, MVP scope, auction rules, architecture, bid engine design, data model, sprint plan, team and launch checklist.

## In one paragraph

Pakistan already runs auctions: customs and bank tenders, Japanese dealer auctions with graded "auction sheets", mass-market online car auctions, and informal Instagram and WhatsApp sales. What doesn't exist is a **trusted** place to buy and sell high-value items. We launch with watches (the engine) and a handful of collector cars (the hero). The format is borrowed from Bring a Trailer and Catawiki: curated 7-day timed auctions with proxy bidding, soft close, public results and open Q&A. It is wrapped in a Pakistan-specific trust layer: KYC'd bidders with refundable deposits, pre-sale authentication and inspection, escrow-style settlement through a client-money account, title and lien checks, and privacy by design. The first step is to resolve the tax treatment of auction sales (ITO s.236A), sign 30+ founding consignments, and run 2–3 manual pilot sales while the MVP is built.
