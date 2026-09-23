# Auction: a curated auction house for Pakistan

A trust-first online auction platform for **luxury watches**, **collector and high-end cars**, and selected **collectibles** in Pakistan.

## Watches MVP (the code in this repo)

A working auction platform for authenticated luxury watches: bidder sign-up with KYC and deposits, live proxy bidding with soft close, and an admin back office for intake, authentication reports, lots, payments and consignor payouts. Next.js + PostgreSQL.

```bash
npm install && cp .env.example .env.local   # set APP_ENCRYPTION_KEY and SESSION_SECRET
npm run db:migrate && npm run db:seed && npm run dev
npm test
```

See [`docs/watches-mvp.md`](docs/watches-mvp.md) for scope, setup, the operating runbook and the pre-launch checklist.

## Documents

- [`docs/watches-mvp.md`](docs/watches-mvp.md): the watches MVP (what's built, how to run and operate it, what's left before the first sale).

- [`docs/strategy.md`](docs/strategy.md): market landscape, why online auctions haven't caught on, category assessment, international auction models and which to use, feasibility (payments, legal/tax, security, economics), go-to-market, risks, and the decisions the founders need to make.
- [`docs/build-plan.md`](docs/build-plan.md): phased roadmap, MVP scope, auction rules, architecture, bid engine design, data model, sprint plan, team and launch checklist.

## In one paragraph

Pakistan already runs auctions: customs and bank tenders, Japanese dealer auctions with graded "auction sheets", mass-market online car auctions, and informal Instagram and WhatsApp sales. What doesn't exist is a **trusted** place to buy and sell high-value items. We launch with watches (the engine) and a handful of collector cars (the hero). The format is borrowed from Bring a Trailer and Catawiki: curated 7-day timed auctions with proxy bidding, soft close, public results and open Q&A. It is wrapped in a Pakistan-specific trust layer: KYC'd bidders with refundable deposits, pre-sale authentication and inspection, escrow-style settlement through a client-money account, title and lien checks, and privacy by design. The first step is to resolve the tax treatment of auction sales (ITO s.236A), sign 30+ founding consignments, and run 2–3 manual pilot sales while the MVP is built.
