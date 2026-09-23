import { DatabaseError } from "pg";
import { queryOne } from "./db";
import { formatPKR } from "./money";
import { notifier } from "./notify";

export type BidResult = {
  outcome: "leading" | "outbid" | "max_increased" | "duplicate";
  lot_id: string;
  current_price: number;
  leader_id: string;
  ends_at: string;
  reserve_met?: boolean;
  displaced_leader_id?: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_AMOUNT: "Enter a valid amount.",
  LOT_NOT_FOUND: "This lot doesn't exist.",
  LOT_NOT_OPEN: "Bidding on this lot hasn't opened yet.",
  LOT_CLOSED: "Bidding on this lot has closed.",
  BIDDER_NOT_FOUND: "Please sign in again.",
  BIDDER_SUSPENDED: "Your account is suspended. Contact us for help.",
  KYC_REQUIRED: "Your identity must be verified before you can bid.",
  SELLER_CANNOT_BID: "Consignors can't bid on their own lots.",
  BID_LIMIT_EXCEEDED: "This bid is above your available bid limit. Add a deposit to raise it.",
  BID_TOO_LOW: "Your bid is below the minimum next bid.",
  MAX_NOT_HIGHER: "You're already leading. A new maximum must be higher than your current one.",
};

export class BidError extends Error {
  constructor(public code: string) {
    super(ERROR_MESSAGES[code] ?? "Your bid couldn't be placed. Please try again.");
  }
}

export async function placeBid(
  lotId: string,
  bidderId: string,
  maxAmount: number,
  idempotencyKey: string | null,
): Promise<BidResult> {
  let result: BidResult;
  try {
    const row = await queryOne<{ r: BidResult }>("select place_bid($1, $2, $3, $4) as r", [
      lotId,
      bidderId,
      maxAmount,
      idempotencyKey,
    ]);
    result = row!.r;
  } catch (err) {
    if (err instanceof DatabaseError && err.code === "P0001" && err.message in ERROR_MESSAGES) {
      throw new BidError(err.message);
    }
    throw err;
  }

  if (result.displaced_leader_id) {
    // Fire-and-forget; a failed notification must never fail a bid.
    notifyOutbid(result.displaced_leader_id, lotId, result.current_price).catch((e) =>
      console.error("outbid notification failed", e),
    );
  }
  return result;
}

async function notifyOutbid(userId: string, lotId: string, price: number) {
  const row = await queryOne<{ phone: string; lot_number: number; title: string }>(
    `select u.phone, l.lot_number, w.brand || ' ' || w.model as title
       from users u, lots l join watches w on w.id = l.watch_id
      where u.id = $1 and l.id = $2`,
    [userId, lotId],
  );
  if (!row) return;
  const url = `${process.env.APP_URL ?? ""}/lots/${lotId}`;
  await notifier().send(row.phone, `You've been outbid on Lot ${row.lot_number} (${row.title}). Current bid ${formatPKR(price)}. ${url}`);
}
