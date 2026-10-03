// Integration tests for the bid engine against a real Postgres.
// Requires TEST_DATABASE_URL (the database is wiped).
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { migrate } from "../scripts/migrate";
import { bidIncrement } from "@/lib/money";

pg.types.setTypeParser(20, (v) => Number(v));

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

let pool: pg.Pool;
let phoneSeq = 0;

async function q<T extends pg.QueryResultRow = any>(sql: string, params: unknown[] = []) {
  return (await pool.query<T>(sql, params)).rows;
}

async function user(opts: { limit?: number; kyc?: string; phone?: string; emailVerified?: boolean } = {}) {
  const seq = ++phoneSeq;
  const phone = opts.phone ?? `+92300${String(seq).padStart(7, "0")}`;
  const [u] = await q(
    `insert into users (phone, handle, kyc_status, bid_limit, email, email_verified_at)
     values ($1, $2, $3, $4, $5, case when $6 then now() end) returning id`,
    [phone, `bidder${seq}`, opts.kyc ?? "approved", opts.limit ?? 100_000_000, `b${seq}@example.com`, opts.emailVerified ?? true],
  );
  return u.id as string;
}

type LotOpts = {
  start?: number; reserve?: number | null; endsInSec?: number; consignorPhone?: string; consignorUser?: string;
  extensionSec?: number; custody?: string; noShill?: boolean; status?: string;
};
async function lot(opts: LotOpts = {}) {
  const [c] = await q(
    "insert into consignors (name, phone, user_id, no_shill_agreed_at) values ('Seller', $1, $2, case when $3 then now() end) returning id",
    [opts.consignorPhone ?? "+923339999999", opts.consignorUser ?? null, opts.noShill ?? true],
  );
  const [w] = await q(
    "insert into watches (consignor_id, brand, model, reference, status, custody_status) values ($1, 'Rolex', 'Submariner', '124060', 'listed', $2) returning id",
    [c.id, opts.custody ?? "in_custody"],
  );
  const ends = `${opts.endsInSec ?? 3600} seconds`;
  const [l] = await q(
    `insert into lots (watch_id, status, starting_price, reserve_price, starts_at, ends_at, scheduled_ends_at, extension_seconds)
     values ($1, $5, $2, $3, now() - interval '1 minute', now() + $4::interval, now() + $4::interval, $6) returning id`,
    [w.id, opts.start ?? 1_000_000, opts.reserve ?? null, ends, opts.status ?? "published", opts.extensionSec ?? 300],
  );
  return l.id as string;
}

async function bid(lotId: string, bidder: string, max: number, key: string | null = null) {
  const [r] = await q("select place_bid($1, $2, $3, $4) as r", [lotId, bidder, max, key]);
  return r.r;
}

async function bidError(lotId: string, bidder: string, max: number): Promise<string> {
  try {
    await bid(lotId, bidder, max);
  } catch (e: any) {
    return e.message;
  }
  throw new Error("expected bid to fail");
}

async function state(lotId: string) {
  const [l] = await q("select * from lots where id = $1", [lotId]);
  return l;
}

d("place_bid", () => {
  beforeAll(async () => {
    const admin = new pg.Client({ connectionString: url });
    await admin.connect();
    await admin.query("drop schema public cascade; create schema public;");
    await admin.end();
    await migrate(url!, () => {});
    pool = new pg.Pool({ connectionString: url, max: 30 });
  });
  afterAll(async () => pool?.end());
  beforeEach(async () => {
    await q("truncate bids, invoices, settlements, lots, media, authentication_reports, custody_events, watch_tags, watches, consignors, deposits, audit_log, invites, users cascade");
    await q("update app_settings set pilot_mode = true, invite_only = true");
  });

  it("opens at the starting price and follows proxy rules", async () => {
    const l = await lot({ start: 1_000_000 });
    const a = await user();
    const b = await user();

    expect((await bid(l, a, 2_000_000)).outcome).toBe("leading");
    expect((await state(l)).current_price).toBe(1_000_000);

    // B bids below A's max: A's proxy defends at B + increment.
    const r = await bid(l, b, 1_500_000);
    expect(r.outcome).toBe("outbid");
    expect((await state(l)).current_price).toBe(1_500_000 + bidIncrement(1_500_000));
    expect((await state(l)).leader_id).toBe(a);

    // B exceeds A's max: B leads at A's max + increment.
    const r2 = await bid(l, b, 3_000_000);
    expect(r2.outcome).toBe("leading");
    expect(r2.displaced_leader_id).toBe(a);
    const s = await state(l);
    expect(s.leader_id).toBe(b);
    expect(s.current_price).toBe(2_000_000 + bidIncrement(2_000_000));
  });

  it("gives ties to the earlier bidder", async () => {
    const l = await lot({ start: 1_000_000 });
    const a = await user();
    const b = await user();
    await bid(l, a, 2_000_000);
    expect((await bid(l, b, 2_000_000)).outcome).toBe("outbid");
    const s = await state(l);
    expect(s.leader_id).toBe(a);
    expect(s.current_price).toBe(2_000_000);
  });

  it("rejects bids below the minimum next bid", async () => {
    const l = await lot({ start: 1_000_000 });
    const a = await user();
    const b = await user();
    expect(await bidError(l, a, 999_999)).toBe("BID_TOO_LOW");
    await bid(l, a, 1_000_000);
    expect(await bidError(l, b, 1_010_000)).toBe("BID_TOO_LOW");
    expect((await bid(l, b, 1_025_000)).outcome).toBe("leading");
  });

  it("jumps to the reserve once a max covers it", async () => {
    const l = await lot({ start: 1_000_000, reserve: 2_500_000 });
    const a = await user();
    const r = await bid(l, a, 1_500_000);
    expect(r.reserve_met).toBe(false);
    expect((await state(l)).current_price).toBe(1_000_000);
    const r2 = await bid(l, a, 3_000_000);
    expect(r2.outcome).toBe("max_increased");
    expect(r2.reserve_met).toBe(true);
    expect((await state(l)).current_price).toBe(2_500_000);
  });

  it("extends a late bid by the lot's window (5 minutes by default)", async () => {
    const l = await lot({ endsInSec: 30 });
    const a = await user();
    const before = (await state(l)).ends_at as Date;
    await bid(l, a, 1_000_000);
    const after = (await state(l)).ends_at as Date;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
    expect(after.getTime() - Date.now()).toBeGreaterThan(290_000);
  });

  it("uses a per-lot extension window", async () => {
    const l = await lot({ endsInSec: 150, extensionSec: 120 });
    const before = (await state(l)).ends_at as Date;
    await bid(l, await user(), 1_000_000);
    // 150s left is outside a 120s window, so no extension.
    expect(((await state(l)).ends_at as Date).getTime()).toBe(before.getTime());
    const l2 = await lot({ endsInSec: 60, extensionSec: 120 });
    await bid(l2, await user(), 1_000_000);
    const left = ((await state(l2)).ends_at as Date).getTime() - Date.now();
    expect(left).toBeGreaterThan(110_000);
    expect(left).toBeLessThan(125_000);
  });

  it("does not extend when bidding early", async () => {
    const l = await lot({ endsInSec: 3600 });
    const a = await user();
    const before = (await state(l)).ends_at as Date;
    await bid(l, a, 1_000_000);
    expect(((await state(l)).ends_at as Date).getTime()).toBe(before.getTime());
  });

  it("in pilot mode requires a verified email, not a CNIC", async () => {
    const l = await lot();
    expect(await bidError(l, await user({ emailVerified: false }), 1_000_000)).toBe("EMAIL_UNVERIFIED");
    expect((await bid(l, await user({ kyc: "none" }), 1_000_000)).outcome).toBe("leading");
  });

  it("enforces KYC, suspension, seller separation and closed lots", async () => {
    await q("update app_settings set pilot_mode = false");
    const l = await lot({ consignorPhone: "+923331112222" });
    expect(await bidError(l, await user({ kyc: "pending" }), 1_000_000)).toBe("KYC_REQUIRED");
    const s = await user();
    await q("update users set suspended = true where id = $1", [s]);
    expect(await bidError(l, s, 1_000_000)).toBe("BIDDER_SUSPENDED");
    expect(await bidError(l, await user({ phone: "+923331112222" }), 1_000_000)).toBe("SELLER_CANNOT_BID");

    const closed = await lot({ endsInSec: 1 });
    await q("update lots set ends_at = now() - interval '1 second' where id = $1", [closed]);
    expect(await bidError(closed, await user(), 1_000_000)).toBe("LOT_CLOSED");
  });

  it("enforces bid limits across all lots a bidder leads", async () => {
    const a = await user({ limit: 3_000_000 });
    const l1 = await lot();
    const l2 = await lot({ start: 500_000 });
    await bid(l1, a, 2_000_000);
    expect(await bidError(l2, a, 1_500_000)).toBe("BID_LIMIT_EXCEEDED");
    expect((await bid(l2, a, 500_000)).outcome).toBe("leading");
    // Raising the max on a lot already led replaces, rather than adds to, its exposure.
    expect((await bid(l1, a, 2_500_000)).outcome).toBe("max_increased");
    expect(await bidError(l1, a, 2_600_000)).toBe("BID_LIMIT_EXCEEDED");
  });

  it("is idempotent for retried requests", async () => {
    const l = await lot();
    const a = await user();
    await bid(l, a, 1_500_000, "k1");
    expect((await bid(l, a, 1_500_000, "k1")).outcome).toBe("duplicate");
    expect((await state(l)).bid_count).toBe(1);
  });

  it("stays consistent under concurrent bidding", async () => {
    const l = await lot({ start: 100_000 });
    const bidders = await Promise.all(Array.from({ length: 20 }, () => user()));
    const maxes = bidders.map((_, i) => 200_000 + i * 37_500 + (i % 3) * 1_000);
    // Fire 3 rounds of every bidder at once.
    const attempts = [...maxes, ...maxes.map((m) => m + 10_000), ...maxes.map((m) => m + 20_000)];
    await Promise.allSettled(attempts.map((m, i) => bid(l, bidders[i % bidders.length], m)));

    const s = await state(l);
    const bids = await q("select bidder_id, max(max_amount) as m from bids where lot_id = $1 and max_amount is not null group by bidder_id order by m desc", [l]);
    // The leader is whoever holds the highest max, and the price never exceeds it.
    expect(s.leader_id).toBe(bids[0].bidder_id);
    expect(s.leader_max).toBe(bids[0].m);
    // Price must be the second-highest max + increment, capped at the leader's max.
    const expected = Math.min(bids[0].m, bids[1].m + bidIncrement(bids[1].m));
    expect(s.current_price).toBe(expected);
  });

  it("closes lots and raises an invoice and settlement for sold lots", async () => {
    const sold = await lot({ start: 1_000_000, reserve: 1_500_000 });
    const unsold = await lot({ start: 1_000_000, reserve: 5_000_000 });
    const a = await user();
    await bid(sold, a, 3_000_000);
    await bid(unsold, a, 2_000_000);
    await q("update lots set ends_at = now() - interval '1 second'");

    const [{ n }] = await q("select close_due_lots() as n");
    expect(n).toBe(2);

    const [s] = await q("select * from lots where id = $1", [sold]);
    expect(s.result).toBe("sold");
    const [inv] = await q("select * from invoices where lot_id = $1", [sold]);
    expect(inv.hammer).toBe(1_500_000);
    expect(inv.buyer_premium).toBe(112_500);
    expect(inv.total).toBe(1_612_500);
    const [st] = await q("select * from settlements where lot_id = $1", [sold]);
    expect(st.seller_fee).toBe(75_000);
    expect(st.net_payout).toBe(1_425_000);

    expect((await state(unsold)).result).toBe("unsold");
    expect(await q("select * from invoices where lot_id = $1", [unsold])).toHaveLength(0);
  });

  it("only publishes lots for watches in custody with a signed no-shill agreement", async () => {
    await expect(lot({ custody: "with_consignor" })).rejects.toThrow("WATCH_NOT_IN_CUSTODY");
    await expect(lot({ noShill: false })).rejects.toThrow("NO_SHILL_AGREEMENT_MISSING");
    const draft = await lot({ custody: "with_consignor", status: "draft" });
    await expect(q("update lots set status = 'published' where id = $1", [draft])).rejects.toThrow("WATCH_NOT_IN_CUSTODY");
  });

  it("combines staff-assigned limits with deposits", async () => {
    const a = await user({ limit: 0 });
    await q("update users set assigned_limit = 2000000 where id = $1", [a]);
    await q("insert into deposits (user_id, amount, method, reference, status) values ($1, 100000, 'raast', 'R1', 'confirmed')", [a]);
    const [{ l }] = await q("select recalc_bid_limit($1) as l", [a]);
    expect(l).toBe(4_000_000);
  });

  it("records a post-auction sale with a bidder, through the same invoice and settlement", async () => {
    const l = await lot({ start: 1_000_000, reserve: 3_000_000 });
    const a = await user();
    const stranger = await user();
    await bid(l, a, 2_000_000);
    await q("update lots set ends_at = now() - interval '1 second'");
    await q("select close_due_lots()");
    expect((await state(l)).result).toBe("unsold");

    await expect(q("select record_post_auction_sale($1, $2, 2500000, null)", [l, stranger])).rejects.toThrow("BUYER_DID_NOT_BID");
    await q("select record_post_auction_sale($1, $2, 2500000, null)", [l, a]);
    const s = await state(l);
    expect(s.result).toBe("sold");
    expect(s.sold_via).toBe("post_auction");
    const [inv] = await q("select * from invoices where lot_id = $1", [l]);
    expect(inv.buyer_id).toBe(a);
    expect(inv.total).toBe(2_500_000 + 187_500);
    await expect(q("select record_post_auction_sale($1, $2, 2600000, null)", [l, a])).rejects.toThrow("LOT_NOT_UNSOLD");
  });

  it("keeps bids append-only", async () => {
    const l = await lot();
    await bid(l, await user(), 1_000_000);
    await expect(q("update bids set amount = 1")).rejects.toThrow(/append-only/);
  });

  it("matches the TypeScript increment table", async () => {
    for (const p of [0, 49_999, 50_000, 199_999, 200_000, 999_999, 1_000_000, 4_999_999, 9_999_999, 24_999_999, 49_999_999, 50_000_000]) {
      const [{ inc }] = await q("select bid_increment($1) as inc", [p]);
      expect(inc).toBe(bidIncrement(p));
    }
  });
});
