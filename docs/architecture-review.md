# Architecture document review (Anas, October 2026)

This reviews *Nilaam MVP Architecture* (Anas, 4 Oct 2026). It compares the document against the watches MVP already in this repo and against [`watches-mvp.md`](./watches-mvp.md), [`build-plan.md`](./build-plan.md) and [`strategy.md`](./strategy.md).

**Summary.** The stack, the bid transaction design, the conventions and the build process are sound. Most of them match what's already built. The main issue is that the document reads as a plan to **build the MVP from scratch, alone**. A working MVP already exists on the same stack, and the document leaves out the parts that make Nilaam a trusted middle man:

- custody of every watch
- the client-money account
- deposits and bid limits
- fees and invoices
- consignor payouts
- KYC
- the no-shill agreement
- pilot mode and invites

It also defers proxy bidding, which the built engine and the strategy treat as core.

---

## 1. Questions for tonight

| # | Question | Why it matters |
|---|---|---|
| A1 | **Do we build on the existing codebase, or start again?** | The repo already runs Next.js + TypeScript + Postgres with phone OTP, a locked-row bid function, an admin under `/admin`, an audit log, closing and invoicing, and tests. Anas's plan lists eight build slices. Six are done, and the remaining two (notifications, hardening) are the blocking items in `watches-mvp.md`. Starting again would cost weeks and lose tested behaviour. Recommendation: keep the codebase. Anas takes ownership of product and UX and works through Claude Code on it. |
| A2 | **Who builds, and who reviews?** | The doc says Anas will build alone with no programming background. Agree on who can merge to `Main`, and who does the "one human review" of the bid function and access rules before money moves (doc step 6, which we fully agree with). |
| A3 | **Proxy bidding: in or out?** | The doc defers it. It is already built and tested (`place_bid`), and it's what lets busy collectors leave a maximum instead of watching the clock. Removing it would be extra work and a worse product. Recommendation: keep. |
| A4 | **Is the middle-man model in scope for the MVP?** | The doc's admin covers "mark payment received, mark item collected". It doesn't cover custody before publishing, the segregated client account, deposits and bid limits, buyer's premium and seller fee, consignor payouts after collection, or CNIC checks. These are the trust layer in `strategy.md`, and the pilot already runs on them. Confirm they stay. |
| A5 | **Login: phone OTP or email?** | The doc suggests email login because SMS to Pakistan is costly and unreliable. Today the pilot needs **both**: phone is the identity (invite links, blocking the seller's own number, WhatsApp contact), and email must be verified to bid. Options: (a) keep phone as identity but send the code by email or WhatsApp authentication template at launch, with SMS as fallback; (b) switch to email-first, which weakens seller-blocking and invite tracking. Recommendation: (a). |
| A6 | **Which settings can admins edit?** | The doc wants increment tiers, the anti-snipe window and the payment deadline editable in admin. The anti-snipe window is already per lot. Increment tiers are defined in SQL and TypeScript, with a test that keeps the two in sync. If tiers become admin-editable, a change during a live auction would change the minimum next bid in the middle of bidding. Recommendation: keep tiers in code, or snapshot them per lot when it's published. Making the payment deadline a setting is fine (see §3). |

---

## 2. What the document gets right (already in place or worth adopting)

| Doc point | Status in repo |
|---|---|
| Next.js + TypeScript, one codebase, admin under `/admin` | Built (plain CSS, not Tailwind. No reason to switch.) |
| Postgres, row-locked bid function, idempotency key, increment tiers, reserve-met flag | Built: `place_bid` in `db/migrations`, tested with 60 concurrent bids |
| Server owns the end time; close job re-checks `ends_at`; bids after `ends_at` rejected regardless of the job | Built (`close_due_lots`, `place_bid`) |
| Server clock offset sent to the client; countdown is cosmetic | Built (`server_time` in `LotState`) |
| UTC storage, PKT display; integer rupees; append-only bids | Built. Bids are append-only, enforced in the database and tested. |
| Audit log of admin actions | Built (`audit_log`) |
| Versioned migrations, seed script, local environment | Built (`db/migrations`, `npm run db:seed`) |
| Supabase in Mumbai, Vercel functions in Mumbai, `pg_cron` or a scheduled function for closing | Planned in `watches-mvp.md` → Hosting |
| **WhatsApp link previews (title, photo, price)** | **Missing. Adopt.** Lot pages have no Open Graph metadata. Add `generateMetadata` with the lead photo, title, current bid and end time. Little work, and high value for WhatsApp-referred traffic. |
| **Object storage with CDN resizing for photos** | Planned (blocking item: "Photo upload"). R2 is a good choice because it charges nothing for downloads. Keep the EXIF/GPS stripping requirement. |
| **Staging environment with its own database and secrets; production deploys only from the main branch** | **Adopt.** Today we only have local and test databases. |
| **`CLAUDE.md` with stack, conventions and "never change the bid function without tests"** | **Adopt.** There is no `CLAUDE.md` yet. |
| Thin slices, commit per working step, preview deploys, test the bid function hardest, security pass, human review | Agree with all of it |
| Durable Objects only if the team already knows them | Agree, skip |

---

## 3. Corrections and risks

1. **Anti-snipe wording.** "Extends the end time by 5 minutes" is not what the engine does. A bid inside the window **resets** the end to *now + window*, and the window is set per lot. This is the same wording issue raised in the [prototype review](./product-page-review.md#copy-corrections).
2. **Optimistic UI and proxy bidding don't mix.** The doc proposes showing a bid as accepted before the server responds. With proxy bidding, a bid can lose instantly to a higher hidden maximum, so an optimistic "You're leading" would be wrong some of the time. Show a short "Placing bid…" state instead. Server round-trips from Mumbai are fast enough.
3. **"The amount it saw" is a good addition.** If the client also sends the price it displayed, the server can say "The price moved to PKR X" instead of a generic rejection. This is a small change to `/api/lots/[id]/bid`.
4. **Realtime vs polling.** We poll every 4 seconds, and every 1.5 seconds near the end. That is enough for a pilot with tens of bidders per lot. Supabase Realtime needs the Supabase browser client and a public key in the page, which brings in the row-level-security work below. Recommendation: keep polling for the pilot, and move to Realtime broadcast when concurrency needs it.
5. **Supabase's public Data API is a real risk.** Our app connects to Postgres directly from the server, so row-level security isn't used today. But every Supabase project exposes its tables through an auto-generated API by default, using a key that is meant to be public. Before production: turn the Data API off, or enable RLS on every table with no policies. Without this, anyone could read bids, CNICs (encrypted) and reserves through that API. Add it to the security pass, alongside per-IP rate limits on the OTP and bid endpoints (not built yet).
6. **Payment deadline mismatch (a bug today).** Invoices are due `now() + 3 days` (calendar days, in SQL), but the how-it-works page, the account page and `build-plan.md` all promise **3 business days**. A lot closing on Friday evening would show as overdue on Monday, two business days early, and a buyer could be marked in default by mistake. Fix this when the deadline becomes a setting.
7. **Cloudflare in front of Vercel.** Two CDNs on top of each other adds cache and TLS confusion, and Vercel advises against proxying through another CDN. Recommendation: use Cloudflare R2 for images only, and serve the app straight from Vercel.
8. **Missing from the document entirely:** custody, client-money handling, deposits and bid limits, fees and invoices, consignor payouts, KYC and CNIC, no-shill, pilot mode and invites, and the authentication report builder. If the document becomes the source of truth for builders using Claude Code, these will be dropped. Fold them in, or point the document at `watches-mvp.md`.
9. **Notifications.** "Email and SMS at launch, WhatsApp later" matches the blocking item, and the `Notifier` interface in `src/lib/notify.ts` is the place to plug them in. Choose the provider before the pilot sale, because OTP depends on it (A5).

---

## 4. Suggested outcome

1. Keep the existing codebase. Merge the doc's good additions into `watches-mvp.md`: Open Graph previews, staging, `CLAUDE.md`, the Supabase Data API lockdown, the client-sent price, and R2.
2. Record the A1–A6 decisions in this file.
3. Next build steps, in order:
   - `CLAUDE.md`, staging and production on Supabase and Vercel with the Data API off
   - OTP delivery provider
   - Open Graph previews
   - photo upload to R2
   - the lot page rework from the prototype review
   - the payment-deadline fix
   - security pass and human review
