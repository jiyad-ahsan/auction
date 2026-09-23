# Strategy: A Curated Auction House for Pakistan

_Status: working draft for discussion, September 2026. Figures marked **(est.)** are our own assumptions to validate. Legal and tax points are issues to take to counsel. They are not advice._

---

## 1. Summary

**What we recommend:** Launch a **curated, trust-first online auction house**. Start with **luxury watches** and a small set of **collector and high-end cars**, then add **focused collectibles** subcategories. The model borrows from Bring a Trailer and Catawiki: a small number of well-documented lots, 7-day timed auctions, open bid histories and published results. We add something those platforms don't need in their markets: a **physical trust layer**. That means authentication and inspection, KYC'd bidders who put down refundable deposits, escrow-style settlement, and secure handovers.

**Why it can work now:**
- Payments are now digital: Raast and 92% digital retail payment volume.
- Vehicle transfers are now online: biometric transfer via the Pak-ID app in Punjab.
- Import restrictions have made good cars scarce.
- Buyers already know and trust the idea of an "auction sheet" from Japanese car imports.
- The founder's network supplies the hardest thing to get: consignments.

**What we don't do:** An open, eBay-style auction site for everyone. Globally that model has failed wherever trust is low; eBay lost China to Taobao and Alipay escrow. In Pakistan the space is already crowded with classifieds like OLX and PakWheels.

**The real product is trust, not bidding software.** The bidding engine is a few weeks of work. Authentication, deposits, settlement, title checks and discretion are the moat.

**Biggest open risks:**
1. **Tax treatment:** whether advance tax under Income Tax Ordinance s.236A (10% on goods sold by auction) could apply to our buyers.
2. **Early liquidity:** enough qualified bidders per lot.
3. **One authenticity failure** could kill the brand.
4. **Physical security:** we would be advertising who owns valuable assets.

All four are manageable, but #1 must be answered before launch.

---

## 2. Correcting the premise: what already exists

"No auction site has caught on" is mostly true, but not entirely. We should know the landscape.

| Where auctions happen in Pakistan today | Format | Relevance to us |
|---|---|---|
| **FBR / Customs auctions** of confiscated goods and vehicles; bank and leasing repossessions; government surplus | Sealed tender or open outcry, often published as tender notices | Proves auctions are culturally and legally normal. Later a possible B2B "auction-as-a-service" customer. |
| **Japanese dealer auctions (USS etc.)**, which feed most imported used cars | B2B, graded condition "auction sheets" | Buyers already trust a **graded condition report**. We should borrow that language. |
| **Car Mandi** (carmandi.pk), **FameWheels** | Online timed auctions for mass-market used cars with inspection and a hidden reserve | Direct precedent. Online car auctions exist, but in the **mass/dealer segment, not curated collector/luxury**. |
| **PakWheels "Sell It For Me"** | Managed classified listing: inspection, negotiation on the seller's behalf, 1% commission | Pakistan's biggest auto marketplace chose **managed selling over auctions**. This sets the bar for seller fees and service. |
| Wholesale produce mandis (arhti auctions), cattle markets, Peshawar's gem markets | Open outcry, negotiated, cash | Cultural familiarity. Negotiation is the default way to set prices. |
| Instagram / WhatsApp / Facebook groups (watches, coins, stamps, antiques) | Informal "bid in comments" auctions, DM haggling, cash or bank transfer | **This is the real incumbent** for our categories: fragmented, high fraud, no guarantees. |
| International platforms (Chrono24, eBay, BaT, Christie's) | Varies | Pakistani sellers can rarely use them (shipping, payouts, FX). Pakistani buyers use them for reference prices. |

**Takeaway:** online auctions in Pakistan so far are either **B2B/mass-market cars** or **informal and untrusted social-media auctions**. Nobody owns **"the trusted place to buy and sell things worth owning."**

### Why online auctions haven't caught on (and what each means for design)

| Barrier | Design response |
|---|---|
| Fear of fakes, fraud and scams (fake bank-transfer screenshots, replicas, stolen or lien cars) | Pre-sale authentication and inspection, authenticity guarantee, funds verified in our account before release, title/lien checks |
| "Bid and walk": non-serious bidders | KYC (CNIC + phone), **refundable bidder deposit** that sets a bid limit and is forfeited for non-payment (the UAE/Emirates Auction model) |
| Cash-on-delivery culture, no escrow | Buyer pays us (Raast / IBFT / pay order). We hold funds, release to the seller after handover and a short inspection window. |
| Negotiation culture; auctions feel risky or "gambling-like" | Visible reserve status, "make an offer" after a lot fails to sell, education content, strict ban on shill bidding (also *najash*, prohibited in Islamic commercial ethics) |
| Sellers want discretion (tax visibility, security, social reasons) | Public results, **private identities**, no locations shown, secure handover rooms, optional private-sale desk |
| Thin buyer pools per category | Curation (fewer, better lots), a concentrated calendar, no-reserve hero lots, diaspora bidders later |

---

## 3. Category assessment

Scores run 1 (poor) to 5 (strong). They are judgement calls to pressure-test with the network.

| Criterion | Luxury watches | Collector & high-end cars | General collectibles |
|---|---|---|---|
| Our supply access (network) | 5 | 4 | 3 (depends on subcategory) |
| Value per lot / revenue per lot | 4 (PKR ~1–15M) | 5 (PKR ~10–150M+) | 2 (PKR ~10k–2M; art higher) |
| Size of trust gap we can close | 5 (replicas everywhere) | 4 (title, lien, accident history) | 4 |
| Operational complexity | 2 (small, portable) | 4 (inspection, storage, transfer) | 3 (many SKUs, many experts) |
| Deal frequency / liquidity | 4 | 2 | 4 |
| Regulatory / tax exposure | 3 (AML optics for portable high value) | 3 (registration, import-status checks) | 3 (antiquities, arms and wildlife exclusions) |
| Brand / PR value | 4 | 5 | 3 |
| **Verdict** | **Launch category: the engine** | **Launch category: the hero (few lots)** | **Phase 2: pick 2–3 subcategories** |

### 3.1 Luxury watches: the engine
- **Why:** high value, easy logistics (hand-carry or insured courier), a severe counterfeit problem that makes authentication worth paying for, and regular liquidity events (upgrades, estates, emigration, cash needs). PKR depreciation also keeps watches attractive as a portable store of value.
- **Price discovery:** global reference prices exist (Chrono24). Our value is not "finding the price". It is **selling above a local dealer's buy offer** because the buyer gets a guarantee. Dealer buy/sell spreads on pre-owned luxury watches are believed to be wide, 15–30% **(est.; validate with 10 dealer quotes)**. That spread is our margin and the seller's uplift.
- **Must-haves:** in-house or contracted watchmaker; case-back and movement inspection; timegrapher reading; serial and reference checks; papers and box grading; checks against stolen-watch registers where accessible; flagging service-replacement parts. Publish a **condition grade** styled on the Japanese auction sheet.
- **Exclude at launch:** anything we cannot authenticate with high confidence. Initially that means sticking to brands our specialist knows deeply.

### 3.2 Collector & high-end cars: the hero
- **Why:** the import regime has made interesting cars scarce, and scarcity plus competition is exactly when auctions beat classifieds.
  - Vintage imports are effectively banned.
  - The personal baggage scheme was abolished in January 2026.
  - Imports under the gift and transfer-of-residence schemes carry a one-year transfer lock.
- Pakistan has active enthusiast communities: classic car clubs, rallies, the PakWheels forums. A BaT-style listing with 100+ photos, video, a cold start and an inspection report, plus an open comment thread, is content those communities will share.
- **Watch-outs:**
  - **Supply is finite.** Plan 2–8 cars a month, not 50.
  - The planned cut in regulatory duty on used-car imports (40% falling toward 0% by 2029) could **soften prices for modern imported cars**. Classics and locally rare cars are less exposed.
  - Registration and transfer friction. Mitigated by online biometric transfer in Punjab; Sindh, KP and ICT processes vary.
- **Mandatory checks:**
  - Excise/MTMIS registration record.
  - Customs-paid status (exclude NCP/non-duty-paid cars).
  - **No "open letter" cars**; the registered owner must be the seller or a documented authorised agent.
  - Bank/leasing lien.
  - Stolen-vehicle check (e.g. CPLC in Karachi).
  - Auction-sheet verification for Japanese imports.
  - Independent mechanical and body inspection.

### 3.3 General collectibles: Phase 2, focused
"Collectibles" is too broad. Pick 2–3 subcategories where the network has expertise **and** buyers are active:

| Subcategory | Notes |
|---|---|
| **Pakistani modern & contemporary art** | Sadequain, Gulgee, Chughtai and others have strong records at international South Asian sales, and there is an obvious diaspora buyer base. Needs expert authentication and provenance. **Highest upside.** |
| **Coins, banknotes, stamps** | Active local collector groups, low value per lot, easy logistics. Good for weekly volume and live-stream formats. |
| **Cricket & sports memorabilia** | Natural fit for charity and PR lots. Authentication is harder, so start with provenance-backed items only. |
| **Fountain pens, vintage audio, cameras, sneakers, trading cards** | Younger buyers, Whatnot-style live selling. Test cheaply later. |
| **Gemstones** (emerald, tourmaline, topaz from the north) | Big export angle, but brings gem certification and **DNFBP/AML obligations** (dealers in precious metals and stones). Later phase, after counsel. |

**Hard exclusions:**
- Archaeological antiquities (e.g. Gandhara artefacts), which are regulated under the Antiquities Act 1975 and a trafficking risk.
- Arms, including antique arms, unless we get a licence-verified process later.
- Wildlife products (ivory, etc.).
- Replicas of any kind.
- Anything without provenance for its category.

---

## 4. International auction models and what we can use

| Model | Who proved it | How it works | Use in Pakistan? |
|---|---|---|---|
| **Curated timed online auction with community** | Bring a Trailer, Cars & Bids, Collecting Cars | Editor-curated listings, rich media, 7-day auctions, public comments where the seller answers questions, 2-min soft close, buyer's premium ~5% capped (BaT: 5%, $250 min, $7,500 cap; Collecting Cars: 5%, £5,000 cap), low flat seller fee (BaT $99/$429), public results database | **Yes: core format for cars and watches.** Public comments build trust, and the results database becomes our valuation moat. |
| **Weekly expert-curated category auctions + escrow** | Catawiki | 240+ in-house experts screen items (many rejected), themed weekly auctions, buyer pays Catawiki, funds released to seller after receipt; buyer ~9%, seller ~12.5% | **Yes: core for collectibles (Phase 2).** The escrow flow is exactly what Pakistan's COD culture needs. |
| **Live-streamed auctions** | Whatnot ($8B GMV in 2025, >80% monthly buyer retention) | Seller-hosts run fast live auctions (seconds per lot); entertainment plus community | **Yes, Phase 2:** coins, cards, memorabilia, lower-value watches. Pakistan already has a live-selling culture on TikTok, Facebook and Instagram. |
| **Traditional auction house (saleroom + online + phone)** | Christie's, Sotheby's, Phillips, Bonhams | Specialist-led catalogue sales, gala evenings, buyer's premium ~25%+, guarantees, private sales desk | **Selectively:** 1–2 flagship **hybrid live events** a year (Lahore/Karachi) for PR and top lots. Keep the private-sales desk for discreet HNW sellers. Not the ~25% fee structure. |
| **Deposit-qualified bidding** | Emirates Auction / Dubai RTA plate auctions (AED 5,000 security cheque + registration fee) | Bidders post a security deposit to participate | **Yes, from day 1.** It is the single best fix for non-serious bidders in a low-trust market, and familiar in the Gulf, where many of our buyers have ties. |
| **Wholesale dealer auctions with condition grades** | USS (Japan), Manheim, ACV | Rapid B2B auctions with standard condition grades | **Borrow the grading language** now. A B2B dealer channel is a later option. The mass segment is already contested by Car Mandi and FameWheels. |
| **Salvage / repossession auctions** | Copart, IAA | Insurers, banks and fleets dispose of assets via online auctions | **Phase 3 B2B line:** banks, leasing companies, insurers and corporates in Pakistan still largely use tenders. Boring but steady volume. |
| **Sealed-bid / tender** | Government procurement, real estate | One confidential bid per bidder | **Optional format** for discreet sellers and B2B disposals. Already familiar in Pakistan. |
| **Buy-it-now / make-offer hybrids** | eBay Best Offer, BaT post-auction offers | Negotiation when a lot fails to reach reserve | **Yes:** fits the negotiation culture and rescues unsold lots. |
| **Escrow marketplace instead of auction** | Taobao + Alipay (beat eBay in China) | The trust instrument was escrow, not the auction | **Lesson, not a format:** escrow and guarantees matter more than bidding mechanics. |
| **Dutch / descending auctions** | Aalsmeer flower auctions | Price falls until someone buys | No, except possibly as a "price drop" mechanic for unsold inventory. |
| **Penny auctions / pay-per-bid** | Swoopo (collapsed) | Pay per bid; gambling-like | **Avoid:** reputational, legal and Sharia risk (gharar/maysir). |

### Auction mechanics to adopt
- **Timed English (ascending) auctions**, 7 days for cars and watches, 5–7 days for collectibles. Stagger end times in the evening, Pakistan time. Live-stream auctions are Phase 2.
- **Proxy (max) bidding**, so bidders don't have to watch the clock.
- **Soft close:** any bid in the final 2 minutes extends the lot by 2 minutes. This removes sniping.
- **Reserve:** hidden reserve with a public "reserve met / not met" flag; a **"No Reserve"** badge and prominence for no-reserve lots; post-auction offer window for lots that miss reserve.
- **Fixed PKR bid-increment table** (see build plan).
- **No seller bidding and no shills, ever.**
  - Pakistan's Sale of Goods Act 1930 (s.64) makes a sale voidable by the buyer where undisclosed seller or pretended bidding occurs.
  - We prohibit seller bidding outright, run shill detection, and say so publicly.
- **Full bid history** public, with bidder handles.
- **Outage policy:** if there is a platform outage or a national internet or mobile-data disruption, which happens in Pakistan, affected lots are automatically extended. Publish this rule in advance.

---

## 5. Feasibility

### 5.1 Market & demand: feasible, with a liquidity caveat
- **Buyers:** HNW and upper-middle-class collectors in Karachi, Lahore and Islamabad; dealers, who become customers rather than enemies; and **diaspora** in the Gulf, UK and North America buying for themselves or for family in Pakistan.
- **Digital readiness:**
  - Retail payments are 92% digital by volume (Jan–Mar 2026).
  - About 135M digital banking users.
  - Raast P2M is mandated across regulated institutions.
- **Liquidity is the crux.** An auction needs roughly 3+ serious bidders per lot. Mitigations:
  - Curate to fewer, better lots and pre-market each one to known buyers.
  - Run a concentrated calendar.
  - Use no-reserve hero lots.
  - Use the network to seed both sides.
  - Track **bidders per lot** and **sell-through** from day one.

### 5.2 Operations: feasible, but people-heavy
- **Watches:** one strong watch specialist (plus a contracted watchmaker) can handle ~30–60 lots a month.
- **Cars:** partner with a reputable inspection provider or garage per city. Photography and video are in-house to control quality.
- **Physical:**
  - A secure viewing and handover room in the launch city.
  - Insured storage for consigned watches.
  - Cars stay with owners until sold, or at a partner facility.

### 5.3 Payments & settlement: feasible without our own licence at first
- Buyers pay into a **dedicated client-money bank account** held by our company as the seller's collecting agent, by Raast, IBFT or pay order. We confirm **funds received in our account** before any release (screenshots mean nothing), then pay the seller after handover and the inspection window, net of commission.
- **Deposits:** refundable, via Raast or IBFT, held in the same segregated account, returned within 48h of an auction closing without a win.
- Card payments are useful only for small deposits and fees; card limits make them impractical for lot payments.
- **Later:** bank escrow product or payment-gateway integration (Raast Request-to-Pay) to automate reconciliation. Only consider a PSP/aggregator relationship if volume justifies it.
- **Counsel question:** confirm that holding buyer funds as agent (not a payment service) does not trigger SBP licensing under the Payment Systems and Electronic Fund Transfers Act.

### 5.4 Legal, tax & compliance: feasible, but these must be resolved pre-launch

| # | Issue | Why it matters | Action |
|---|---|---|---|
| 1 | **ITO 2001 s.236A**: advance tax collected by "any person making sale by public auction" (10% of gross sale price for goods; the collecting persons listed include companies) | If it applies to our online auctions, buyers face a 10% advance tax (adjustable for filers), which would badly hurt demand | **Formal tax opinion first.** Explore structures: platform as marketplace/agent where the seller-buyer contract is direct, or treatment of timed online sales vs. "public auction". |
| 2 | **ITO s.6A e-commerce withholding** (from July 2025): 1% on digital payments via intermediaries, 2% on COD via couriers; marketplaces file monthly statements | Affects seller net proceeds and our filings | Build into settlement statements; confirm marketplace reporting duties |
| 3 | **Provincial sales tax on services** on our commissions and fees (PRA, SRB, etc.) | Pricing and invoicing | Register; show fees tax-inclusive or exclusive consistently |
| 4 | **AML/CFT**: high-value portable assets; DNFBP rules for dealers in precious metals and stones require CDD above PKR 2M | Bank relationships and reputation depend on it | Voluntary AML programme from day 1: KYC for all bidders, source-of-funds above PKR 2M, **no cash**, STR process, sanctions screening. Confirm whether DNFBP registration applies (especially if we handle gold or gemstones). |
| 5 | **Sale of Goods Act 1930 s.64**: auction contract formed at "fall of the hammer"; bids retractable before that; seller-bidding rules | Our T&Cs must make timed online bids binding and define when the contract forms | Lawyer-drafted bidder and consignor terms |
| 6 | **SECP incorporation & e-commerce requirements**: physical address, consumer-protection code of conduct | Basic legitimacy | Private limited company; published policies |
| 7 | **Vehicle transfer & import status** | Selling an NCP, open-letter or liened car would be a disaster | Mandatory title checklist and no exceptions (see 3.2) |
| 8 | **Antiquities, arms, wildlife** | Criminal exposure | Excluded categories list |
| 9 | **Data protection & privacy** | CNIC data, HNW personal data | Minimal retention, encryption, access controls |
| 10 | **Diaspora payments / FX** | Paying from abroad | Phase 2. Roshan Digital Account holders can pay in PKR; foreign inward remittance is otherwise case by case. Counsel on FX rules. |

### 5.5 Security: a Pakistan-specific risk to design around
Publicising that someone owns a PKR 10M watch or a rare car creates **robbery and extortion risk** for sellers and buyers.
- Never show seller or buyer names, addresses or neighbourhoods.
- Photograph lots in our studio or a neutral location. Strip EXIF/GPS metadata from uploads.
- Hold handovers at our secure room or a partner facility, never at home addresses.
- Let winners stay anonymous publicly.

### 5.6 Economics: viable at modest scale

**Illustrative fee structure (to test with consignors):**

| Category | Buyer's premium | Seller fee | Blended take (est.) |
|---|---|---|---|
| Watches | 7.5% (min PKR 15k) | 5% (negotiable to 0% for marquee consignments at launch) | ~12.5% |
| Cars | 3% (capped at PKR 1.5M) | Flat listing fee ~PKR 50k, covering inspection and media | ~3% |
| Collectibles | 10% | 10% | ~20% |

Supply is the bottleneck, so **keep seller fees low** and lean on the buyer's premium. Buyers accept it when it buys a guarantee, and it is still below typical dealer markups.

**Illustrative monthly run-rate around month 12 (est.; assumes ~PKR 280/USD):**

| | Conservative | Base |
|---|---|---|
| Watches sold × avg hammer | 10 × PKR 2.5M | 25 × PKR 3.0M |
| Cars sold × avg hammer | 2 × PKR 25M | 6 × PKR 30M |
| Collectibles sold × avg hammer | 60 × PKR 50k | 150 × PKR 60k |
| **Monthly GMV** | **PKR 78M (~$0.28M)** | **PKR 264M (~$0.94M)** |
| Watches revenue (12.5%) | 3.1M | 9.4M |
| Cars revenue (3%) | 1.5M | 5.4M |
| Collectibles revenue (20%) | 0.6M | 1.8M |
| **Monthly net revenue** | **PKR ~5.2M (~$19k)** | **PKR ~16.6M (~$59k)** |

**Cost base (est.):** a lean team of ~8–10, plus a secure room, insurance, media, marketing and legal. That is roughly **PKR 8–10M a month** (~$30–35k), so break-even sits between the two scenarios. **Watch sell-through and average watch value**: they drive the model. Initial capital: roughly **12–18 months of runway (~$400–600k)** to reach break-even without inventory risk, since we work on consignment and never own lots.

---

## 6. Positioning & go-to-market

**Positioning:** "Pakistan's trusted auction house for things worth owning: authenticated, inspected, guaranteed."
- Sellers get more than a dealer offers, with no haggling and discretion.
- Buyers get genuine items, fair competitive prices and guaranteed settlement.

**Launch playbook:**
1. **Founding consignors:** sign 30–50 quality lots from the network before any public launch. Use a launch fee waiver and "founding consignor" status.
2. **Private pilot sales (before software):** 2–3 invitation-only sales of 10–20 lots each, run on a simple web page, WhatsApp and a manual deposit and payment process. Test the core assumptions: will sellers consign, will bidders post deposits, and how do hammer prices compare with dealer offers?
3. **Flagship launch event:** a hybrid live and online sale in Lahore or Karachi with ~40 hero lots (watches, 3–5 cars, a few art and memorabilia pieces), live-streamed, plus **one charity lot** for press.
4. **Then a steady cadence:** a new batch of lots every week, with auctions ending in the evening and Thursday/Friday evening highlights.
5. **Content engine:**
   - Every listing is shareable content: walkaround videos, cold starts, movement close-ups.
   - A weekly "results" post.
   - Collaborations with car clubs, watch collectors and auto YouTubers.
   - The public results database becomes **the reference for valuations** in these categories.
6. **Dealers as customers:** dealer accounts to consign and bid. Don't fight them.
7. **Diaspora (Phase 2):** Gulf and UK marketing, remote bidding, hand-delivery to family in Pakistan.

**North-star and health metrics:**
- GMV and net revenue.
- **Sell-through rate** (target >70%).
- **Qualified bidders per lot** (target ≥4).
- Hammer vs. dealer-offer uplift.
- Deposit-to-bid conversion.
- Non-payment rate (target <2%).
- Authenticity/dispute claims (target ~0).
- Repeat buyer and consignor rates.
- Time from consignment to payout.

---

## 7. Key risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| s.236A or other tax treatment makes auctions uncompetitive | Medium | Severe | Tax opinion before launch; structure as marketplace/agent; fallback to "curated timed offers" if necessary |
| Thin liquidity: lots don't sell and sellers leave | High early | High | Curation, pre-marketing, no-reserve hero lots, seeded bidder list, post-auction offers |
| A fake or misdescribed item gets through | Low–Medium | Severe | Conservative authentication, second opinion on high-value lots, **authenticity guarantee** backed by a reserve fund and insurance, consignor liability in terms |
| Payment fraud (fake transfers, bounced pay orders) | Medium | High | Release only after funds clear in our account; no cash; deposits |
| Shill bidding or dealer "rings" colluding to suppress prices | Medium | Medium–High | KYC-linked accounts, shill detection (bidder–seller links, device/IP clustering, bid-pattern flags), bans, public stance |
| Physical security incidents | Low–Medium | Severe | Privacy by design (5.5), secure handovers, staff protocols |
| Regulatory change (import liberalisation depressing car prices, AML tightening) | Medium | Medium | Watch-led revenue mix; classics over modern imports; strong AML posture |
| Internet disruptions during closes | Medium | Medium | Soft close + automatic outage extensions + SMS fallback |
| Key-person dependency (specialists, founder network) | High | Medium | Document authentication standards; build specialist bench; broaden sourcing |

---

## 8. Decisions needed from the founders

1. **Launch city:** Lahore, Karachi or Islamabad? It should be where the network and first 30 consignments are strongest.
2. **First collectibles subcategories** for Phase 2 (art? coins and banknotes? memorabilia?).
3. **Fee structure** (5.6): validate with 10 prospective consignors and 10 buyers.
4. **Specialists:** who is our lead watch specialist, and who is our car inspection partner?
5. **Brand name and domain** (.pk plus .com).
6. **Flagship event:** yes or no, and target date.
7. **Budget and runway** commitment for the first 12–18 months.

---

## Sources

- Car Mandi, online car auctions in Pakistan: https://www.carmandi.pk/ , https://www.carmandi.pk/about
- FameWheels: https://www.famewheels.com/
- PakWheels Sell It For Me (1% commission): https://www.pakwheels.com/products/pakwheels-sell-it-for-me/
- PakWheels auction sheet verification: https://www.pakwheels.com/auction-sheet-verification/
- FBR customs auctions: https://www.fbr.gov.pk/auctions
- Personal baggage scheme abolished (SRO 61(I)/2026), one-year transfer lock: https://www.pakwheels.com/blog/government-abolishes-used-car-imports-under-personal-baggage-scheme/ , https://www.dawn.com/news/2024014/used-car-imports-thru-personal-baggage-abolished
- Used car import duty phase-down and vintage import ban: https://tribune.com.pk/story/2568732/want-a-cheaper-ride-govt-allows-used-car-imports-but-at-a-steep-price , https://tribune.com.pk/story/2329037/govt-refuses-to-allow-vintage-car-import
- Punjab online biometric vehicle transfer (Pak-ID): https://www.pakwheels.com/blog/vehicle-transfer-biometric-now-online-in-punjab/
- Raast P2M: https://www.sbp.org.pk/dfs/Raast-P2M.html
- Digital payments 92% of retail volume, Q3 FY26: https://tribune.com.pk/story/2615321/electronic-payments-reach-37b-transactions
- s.236A advance tax on auctions: https://pkrevenue.com/advance-tax-on-sale-through-auction/ , https://invest.gov.pk/node/1397
- s.6A e-commerce withholding (Finance Act 2025): https://www.vatupdate.com/2025/08/24/pakistan-introduces-withholding-tax-on-domestic-digital-sales-via-online-marketplaces/ , https://www.hzco.com.pk/publications/publications-pdf/RHZA_HOW-THE-FINANCE-ACT-2025-AFFECTS-E-COMMERCE-AND-ONLINE-PLATFORMS_fnl.pdf
- FBR AML/CFT for DNFBPs (PKR 2M threshold for dealers in precious metals and stones): https://www.fbr.gov.pk/introduction-aml-cft/152366/152367
- SBP payment services regulation overview: https://www.ibanet.org/the-legal-landscape-for-fintech-in-pakistan
- Bring a Trailer fees: https://hypercars.io/blog/bring-a-trailer-fees
- Collecting Cars fees: https://collectingcars.com/faqs , https://collectingcars.com/articles/up-to-99-lower-fees-than-traditional-auctions
- Catawiki model: https://www.catawiki.com/en/help/about , https://growthbusiness.co.uk/special-objects-online-auction-catawiki-17460/
- Whatnot GMV 2025: https://english.ebrun.com/20260211/640428.shtml , https://sacra.com/c/whatnot/
- Emirates Auction / Dubai RTA plate auction deposits: https://www.emiratesauction.com/ , https://gulfnews.com/uae/transport/dubai-rta-to-auction-300-premium-vehicle-number-plates-1.500428054
- Soft close and sniping: https://en.wikipedia.org/wiki/Auction_sniping , https://faculty.haas.berkeley.edu/stadelis/sniping_published_version.pdf
