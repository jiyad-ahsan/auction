# Lot page prototype review (Anas, October 2026)

This reviews Anas's single-file HTML prototype of the lot (product) page, *Nilaam – Product page prototype*, Lot 014, Tudor Black Bay Fifty-Eight. It compares the prototype against what is built (`src/app/lots/[id]/page.tsx`, `src/components/BidPanel.tsx`, `db/migrations/*`) and against the rules in [`watches-mvp.md`](./watches-mvp.md) and [`strategy.md`](./strategy.md).

The prototype was tested in Chromium at 1440×900, 1280×720 and 390×844 (touch). The checks covered the full bid flow, the prototype controls, keyboard use, dark-mode preference, tap-target sizes and colour contrast.

**Summary.** The prototype is a clear improvement on the current lot page, and most of it should be built. Its strongest parts are the bid card hierarchy, the in-page confirm dialog, the mobile sticky bid bar, and moving bid history and the report into tabs. Before we build it, it needs three kinds of changes:

1. **It models a simpler auction than ours.** It has no proxy (maximum) bids, no buyer's premium, no bid limit, and none of the states for signed-out, upcoming or not-eligible bidders.
2. **It uses a different brand.** The page is cream, navy and gold with Playfair and Inter. The shipped Nilaam identity is graphite and white with the timegrapher grid, seconds-hand red and IBM Plex.
3. **Some copy makes promises we don't operate.** These are "Inspect first: view before you bid", "We send the account details by message" and "You pay nothing to bid".

---

## 1. Decisions for the founders

These need an answer before build. Everything else below can go ahead.

| # | Decision | Prototype | Current product | Recommendation |
|---|---|---|---|---|
| D1 | **Visual identity** | Cream `#FAF8F4`, navy `#0F1B2D`, gold `#B08D4A`; Playfair Display + Inter; gold diamond mark | Graphite/white, timegrapher grid, seconds-hand red `#d23a1e`; IBM Plex Sans Condensed + Mono; red dot (`globals.css`) | Pick one before building. If the choice is gold/navy, treat it as a site-wide rebrand (header, cards, admin, dark theme), not a lot-page change. If not, take Anas's layout and interactions into the current identity. Mixing the two would be the worst outcome. |
| D2 | **Pre-bid viewing** ("Inspect first: View before you bid") | Shown as a trust promise next to the bid button | Buyers inspect **at collection**, before signing for the watch. Pre-sale viewing is only planned for the launch sale's viewing event. | Only promise it if we staff viewing appointments in Karachi. Otherwise change it to "Inspect at handover: check the watch before you sign for it". |
| D3 | **Bidder identity in history** | Numbered paddles ("Bidder 4821") | Public handle chosen by the bidder (`users.handle`) | Worth considering. In a small WhatsApp-invite community, chosen handles can be recognised, and "who is bidding against me" can lead to collusion or side deals. Per-lot or per-account paddle numbers are more private. Changing to them affects the schema and the "choose a handle" onboarding step. |
| D4 | **How bank details reach the winner** | "We send the account details by message" | The purchases page in the account shows payment instructions | Do **not** send account details by WhatsApp or SMS. That is the standard payment-diversion scam, where a fraudster sends "updated" bank details. Show the client account only inside the signed-in account. Add a line to the page and all templates: "Nilaam will never send you new bank details by message." |
| D5 | **Proxy bidding presentation** | No proxy bidding. Each bid is a single amount, and you can't bid again while leading. | Proxy (maximum) bidding is the core engine (`place_bid`). Leaders can raise their maximum. | Keep proxy bidding. Change the field label to "Your maximum bid", explain it in one line, and add the "Raise my maximum" state (see §3). |

---

## 2. What to adopt

These are improvements on what we have. Each entry lists where it lands in the code.

### Bid card (`BidPanel.tsx`)
- **Hierarchy.** The order is lot number, title, a one-line spec summary (`Ref · year · movement · size`), the large current price, then "12 bids" (a link that opens the history tab) next to the reserve pill. This reads much faster than the current panel. The title currently sits above the gallery, so it should move into the card on desktop.
- **Time block with states.** A neutral block shows the time left. It turns amber with "Ending soon" under an hour, and red with "Ending very soon" under 5 minutes. The anti-sniping rule is explained inside the block, where it matters. The current panel shows only a countdown that turns red.
- **"Minimum next bid" line plus a −/+ stepper** that moves by the increment and won't go below the minimum. Keep the free-text field too, with live thousands separators.
- **Inline validation.** "Your bid must be at least PKR 390,000." appears under the field with a red outline, instead of a message after submit.
- **Status notes.** "You are the highest bidder" in green and "You have been outbid…" in amber appear above the button, and the button label stays the same. The current panel shows these only after you bid. They should come from `viewer.leading` and `your_max` on every poll, so a bidder who was outbid sees it on their next visit.
- **Trust strip under the button.** It shows *Authenticated (Grade A, view report)*, *12-month guarantee*, and *Collection: Karachi*, with icons. The grade entry jumps to the report tab. It puts the reasons to trust Nilaam next to the decision to bid.

### Confirm dialog
- **Replace `window.confirm()` with a real `<dialog>`.** The current native confirm can't be styled, and on some mobile browsers it is suppressed. Anas's dialog shows the amount large, offers *Cancel* and *Confirm bid*, and has a **"Bid a different amount"** link that returns to the field with the value kept.
- **Race handling.** If someone bids while the dialog is open, it shows "Someone just bid. The minimum is now PKR X." and resets the field. Our server already rejects these bids, so we should show this message instead of a generic error.
- **Result toast.** "Your bid is in. You are the highest bidder." or "…The auction was extended."

### Mobile
- **Sticky bottom bar** with the current price and time left, plus a **"Bid PKR 390,000"** button that opens the confirm dialog at the minimum. It hides while the main Place bid button is on screen. It shows "Winning" when you lead and "Ended" when the auction is over. This is the most valuable change for our mostly-mobile, WhatsApp-referred buyers.
- **Tabs become accordions** below 900px.
- Safe-area insets, a reduced-motion fallback, and no horizontal scroll at 390px (tested).

### Gallery
- **Thumbnails switch the main image in place.** Today they open the raw image in a new tab and take the bidder off the page.
- **Press-and-hold magnifier** (3×, lens sits above the finger, haptic tick). Bidders want to check dial printing, lume and bezel condition, so this is well judged for watches.

### Lot information
- **Tabs:** *Details · Authentication & condition · Bid history · Payment & collection*. Today the specs, report and guarantee are stacked in one long column, and bid history sits inside the sticky panel, which makes the panel very tall. Moving history into a tab is the right call.
- **"If you win" steps** (win, pay by transfer, collect in Karachi) next to the "How bidding works" rules. This answers "what happens next" on the page itself.
- **Condition report layout.** Notes on the left, checks with PASS badges on the right, and the guarantee box under the checks. The report's fields map 1:1 to `auth_reports` (grade, case/dial/movement notes, timegrapher, water test, non-original parts, checks).

### Craft details worth keeping
- Tabular figures for all prices and the clock.
- Visible gold focus rings.
- `aria-pressed` on thumbnails.
- `role="alert"` on the bid error.
- Labelled −/+ buttons.

Colour contrast passes WCAG AA for all text pairs checked:

| Text pair | Contrast |
|---|---|
| Muted text on background | 5.6:1 |
| Gold text on white | 5.3:1 |
| Warning text on warning background | 4.7:1 |
| Danger text on danger background | 5.9:1 |

The one exception is gold text on the pale-gold background, at 4.48:1, which is just under 4.5:1.

---

## 3. What to change before building

### Missing auction mechanics (the prototype is simpler than the engine)
1. **Maximum bids.** Label the field "Your maximum bid (PKR)" and add one helper line: "We bid for you only as much as needed to keep you in front, up to this amount." When the bidder leads, keep the field enabled and change the button to **"Raise my maximum"**. The prototype disables everything once you lead.
2. **Instant outbid by proxy.** In our engine a bid can lose immediately to someone else's higher maximum (`outcome = 'outbid'`). The prototype never shows this. Add the result: "Another bidder's maximum is higher. You've been outbid."
3. **Buyer's premium and total.** Neither the card nor the dialog mentions the 7.5% premium (minimum PKR 15,000). The confirm dialog must show it, for example:

   **PKR 390,000** max bid
   + buyer's premium PKR 29,250
   = **PKR 419,250 if you win at this amount**

   The current panel already calculates the premium (`buyerPremium()`). Dropping it would be a regression and a likely source of disputes.
4. **Bid limit.** Show "Available bid limit: PKR X" under the field, and block the bid inline when the amount is over the limit.
5. **Bidding terms link** in the confirm dialog. This is a blocking item in `watches-mvp.md` ("terms linked at sign-up and bid confirmation").
6. **Name the lot in the confirm dialog** ("Lot 014 · Tudor Black Bay 58"). The mobile sticky bar can open the dialog before the bidder has scrolled to the title.
7. **Fat-finger guard.** Typing `3900000` instead of `390000` goes straight to a normal confirm (tested). When a bid is more than about 3× the current price, add a warning line in the dialog: "That's 10× the current bid. Check the amount."

### Missing page states
The prototype shows only *live, signed in, eligible*. The build also needs these states, all of which `lotState` already provides:

- **Signed out:** a "Sign in to bid" button in place of the form.
- **Not eligible:** the `viewer.reason` messages (verify email, limit not set, suspended, consignor of this lot, no handle), with a link to the account page.
- **Upcoming:** "Bidding opens Sat 12 Oct, 8:00 pm PKT", the starting bid, and no form.
- **No reserve:** the `has_reserve = false` pill.
- **Closed:** "Sold for PKR X" or "Not sold, the consignor may accept offers". The prototype says "This lot has been sold" without the price. Public results are part of our trust model.

### Copy corrections
| Prototype copy | Problem | Use instead |
|---|---|---|
| "A bid in the final 5 minutes extends the auction" / toast "extended by 5 minutes" | The engine **resets** the end to now + 5 min (`003_pilot_custody_tags.sql`). It doesn't add 5 minutes. A bid at 4:30 left gives 5:00, not 9:30. The current `BidPanel` copy has the same error. | "A bid in the last 5 minutes resets the clock to 5 minutes, so everyone can respond." Use the lot's `extension_minutes`, not a hard-coded 5. |
| "You pay nothing to bid" | True only in pilot mode. Full mode needs a refundable deposit. | Drive it from `pilot_mode`. Full mode: "Bidding needs a refundable deposit. You pay for the watch only if you win." |
| "Pay by bank transfer. We send the account details by message." | Payment-diversion risk (D4). The 3-day deadline and the premium are also missing. | "Pay the hammer price plus 7.5% buyer's premium by bank transfer to Nilaam's client account within 3 business days. Details are in your account. We never send bank details by message." |
| "Collect in Karachi … from our storage location" | Missing the CNIC requirement and the inspect-and-sign step. | "Collect at our Karachi viewing room with your CNIC. Inspect the watch before you sign for it." |
| "Inspected by our lead watch specialist." | Less specific than what we have. | Keep the current copy: specialist's name, inspection date, "in Nilaam's custody". |
| Footer "Vintage watch auctions" | A 2020 Tudor isn't vintage. | Match the brand line used elsewhere on the site. |

### Content the prototype drops
- **"About this watch"** (the `description` field). There is no slot for it. Put it at the top of the Details tab.
- **Tags** (*Box & papers*, *Unpolished case*…), which link to the filtered catalogue. Show them under the subtitle.
- **Lakh/crore** next to PKR ("3.85 lakh"). The current panel shows it (`formatLakhCrore`), and it's how most buyers say prices.
- **Absolute end time in PKT** ("Ends Sat 12 Oct, 9:14 pm PKT") under the countdown.
- **Days in the countdown.** Lots run 7 days, and the prototype clock only has h/m/s.
- **Failed and n/a checks.** The prototype only styles PASS. `auth_reports.checks` can also be `fail` or `n/a`.
- **Timegrapher position.** "(dial up)" is a good addition, but we don't record it. Add a `timegrapher_position` field to the report builder if we want it.

### Layout fixes
- **Desktop: price and clock disappear when reading the tabs.** The sticky bar is mobile-only. On desktop, once you scroll into the condition report during the final minutes, the clock is gone. Show the sticky bar at all widths once the bid card is off screen, or make the tabs scroll inside the right-hand column.
- **Short laptops (1280×720): the bid card is taller than the viewport.** The sticky card's title and price scroll under the header (tested: card top at −167px). Make the card more compact (trust strip in one row, smaller time block), or turn off `position: sticky` when the card is taller than `100vh − header`.
- **Lot number appears three times** (image tag, breadcrumb, card). Keep the card's.
- **Tabs aren't wired for assistive tech.** They have no `aria-controls` and no `role="tabpanel"`, arrow keys don't move between them (tested), and the mobile accordion header says "Specifications" while the tab says "Details". Use one label.
- **Magnifier:** add a tap-to-open fullscreen view with pinch-zoom for keyboard and screen-reader users. Also remove the `contextmenu` block and `user-select: none`, so bidders can long-press to save or share a photo to WhatsApp.
- **Small tap targets on mobile:** the menu button is 38×34 and the "12 bids" link is 51×22. Make them at least 44×44.
- **Two live regions:** the status note and the toast both announce the same event to screen readers. Make the toast `aria-hidden` when the note carries the message.
- **No dark theme.** The prototype forces light (`color-scheme: light`; tested with dark preference, background stays cream). The product supports light and dark with a toggle, and whichever identity wins (D1) needs dark tokens.

### Photos
The prototype's four images look like manufacturer marketing renders: perfect lighting, no wear, and a "Tudor Geneve" catalogue look. That's fine for a mock-up, but the build must show the **actual lot** in studio photos. Our runbook already requires this (EXIF stripped, not at the consignor's home), and buyers must see the wear the condition report describes. Using brand renders would also be an IP risk. Images in the build should be served at responsive sizes and lazy-loaded, not inlined.

---

## 4. Bugs in the prototype

These won't carry over if we build from our engine. They're listed so nobody copies the behaviour.

- After you bid, the input and buttons stay disabled until someone outbids you, so you can't raise your bid (see §3, maximum bids).
- −/+ step by the increment at the *current* price, not at the typed amount. Near a band boundary (for example 495,000 → 505,000) the step is wrong. Use `bidIncrement()` on the typed value.
- Relative times ("6 min ago", "Just now") never update.
- "Simulate rival bid" always bids exactly the minimum, so it doesn't show proxy behaviour.
- The prototype's increment table stops at PKR 25,000 above 1M. Ours continues to PKR 1M steps (`money.ts`, `bid_increment()` in SQL). Use ours.
- Pressing Escape on the dialog leaves the pending amount set. It's harmless, because the next open overwrites it.

---

## 5. Build plan

Roughly in order. Each step is shippable on its own.

1. **Decide D1–D5.**
2. **`BidPanel` rework:** hierarchy, time block states, stepper, inline validation, status notes from `viewer`, trust strip, `<dialog>` confirm with premium, total, lot name, terms link and fat-finger guard, race and outbid messages, and every page state in §3.
3. **Lot page layout:** move history out of the panel into tabs (accordions on mobile), add the Payment & collection tab with corrected copy, keep description, tags, lakh/crore and the PKT end time, and fix the extension copy.
4. **Sticky bid bar** (mobile first, then desktop once the card is off screen).
5. **Gallery:** in-place thumbnails, press-and-hold magnifier, fullscreen pinch-zoom.
6. **Identity:** if D1 is a rebrand, do it as a separate site-wide change with dark tokens.

The bid engine, the closing logic and the data model don't need changes for this page. The exceptions are the optional `timegrapher_position` field, and the paddle numbers if we decide D3 that way.
