// PKR money helpers. All amounts are whole rupees.

// Keep in sync with bid_increment() in db/migrations/002_bidding.sql.
const INCREMENTS: [below: number, step: number][] = [
  [50_000, 1_000],
  [200_000, 2_500],
  [500_000, 5_000],
  [1_000_000, 10_000],
  [2_500_000, 25_000],
  [5_000_000, 50_000],
  [10_000_000, 100_000],
  [25_000_000, 250_000],
  [50_000_000, 500_000],
];

export function bidIncrement(price: number): number {
  for (const [below, step] of INCREMENTS) if (price < below) return step;
  return 1_000_000;
}

export function minNextBid(currentPrice: number | null, startingPrice: number): number {
  return currentPrice === null ? startingPrice : currentPrice + bidIncrement(currentPrice);
}

export function buyerPremium(hammer: number, bps: number, min: number): number {
  return Math.max(min, Math.floor((hammer * bps + 5000) / 10000));
}

export function sellerFee(hammer: number, bps: number): number {
  return Math.floor((hammer * bps + 5000) / 10000);
}

export function depositForLimit(limit: number): number {
  return Math.max(50_000, Math.ceil(limit * 0.05));
}

export function formatPKR(amount: number): string {
  return "PKR " + Math.round(amount).toLocaleString("en-US");
}

// "25 lakh", "2.5 crore": how most Pakistani buyers say prices.
export function formatLakhCrore(amount: number): string {
  const trim = (n: number) => (Math.round(n * 100) / 100).toString();
  if (amount >= 10_000_000) return `${trim(amount / 10_000_000)} crore`;
  if (amount >= 100_000) return `${trim(amount / 100_000)} lakh`;
  return Math.round(amount).toLocaleString("en-US");
}
