import { describe, expect, it } from "vitest";
import { bidIncrement, buyerPremium, depositForLimit, formatLakhCrore, formatPKR, minNextBid } from "@/lib/money";
import { normalizePkPhone } from "@/lib/phone";

describe("money", () => {
  it("uses the PKR increment table", () => {
    expect(bidIncrement(0)).toBe(1_000);
    expect(bidIncrement(49_999)).toBe(1_000);
    expect(bidIncrement(50_000)).toBe(2_500);
    expect(bidIncrement(2_499_999)).toBe(25_000);
    expect(bidIncrement(2_500_000)).toBe(50_000);
    expect(bidIncrement(75_000_000)).toBe(1_000_000);
  });

  it("computes the minimum next bid", () => {
    expect(minNextBid(null, 1_000_000)).toBe(1_000_000);
    expect(minNextBid(1_000_000, 500_000)).toBe(1_025_000);
  });

  it("applies the buyer's premium minimum", () => {
    expect(buyerPremium(100_000, 750, 15_000)).toBe(15_000);
    expect(buyerPremium(3_000_000, 750, 15_000)).toBe(225_000);
  });

  it("sizes deposits at 5% with a PKR 50k floor", () => {
    expect(depositForLimit(500_000)).toBe(50_000);
    expect(depositForLimit(10_000_000)).toBe(500_000);
  });

  it("formats amounts", () => {
    expect(formatPKR(2_500_000)).toBe("PKR 2,500,000");
    expect(formatLakhCrore(2_500_000)).toBe("25 lakh");
    expect(formatLakhCrore(25_000_000)).toBe("2.5 crore");
    expect(formatLakhCrore(95_000)).toBe("95,000");
  });
});

describe("phone", () => {
  it("normalises Pakistani mobile numbers", () => {
    expect(normalizePkPhone("0300 1234567")).toBe("+923001234567");
    expect(normalizePkPhone("+92 300 1234567")).toBe("+923001234567");
    expect(normalizePkPhone("923001234567")).toBe("+923001234567");
    expect(normalizePkPhone("3001234567")).toBe("+923001234567");
    expect(normalizePkPhone("042 1234567")).toBeNull();
  });
});
