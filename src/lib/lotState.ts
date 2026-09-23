import type { User } from "./auth";
import { queryOne } from "./db";
import { lotPhase, publicBids, publicLot } from "./lots";
import { minNextBid } from "./money";

export type LotState = {
  id: string;
  phase: "upcoming" | "live" | "ending" | "closed";
  result: "sold" | "unsold" | null;
  starting_price: number;
  current_price: number | null;
  min_next: number;
  bid_count: number;
  ends_at: string;
  starts_at: string;
  has_reserve: boolean;
  reserve_met: boolean;
  leader_handle: string | null;
  buyer_premium_bps: number;
  buyer_premium_min: number;
  bids: { id: number; handle: string | null; amount: number; created_at: string }[];
  server_time: string;
  viewer: null | {
    signed_in: true;
    leading: boolean;
    your_max: number | null;
    can_bid: boolean;
    reason: string | null;
    available_limit: number;
  };
};

export async function lotState(lotId: string, user: User | null): Promise<LotState | null> {
  const lot = await publicLot(lotId);
  if (!lot) return null;
  const bids = await publicBids(lotId);
  const phase = lotPhase(lot);

  let viewer: LotState["viewer"] = null;
  if (user) {
    const row = await queryOne<{ your_max: number | null; exposure: number; is_seller: boolean }>(
      `select
         (select case when l.leader_id = $2 then l.leader_max
                      else (select max(max_amount) from bids where lot_id = $1 and bidder_id = $2) end
            from lots l where l.id = $1) as your_max,
         bidder_exposure($2, $1) as exposure,
         exists (select 1 from lots l join watches w on w.id = l.watch_id join consignors c on c.id = w.consignor_id
                  where l.id = $1 and (c.user_id = $2 or c.phone = $3)) as is_seller`,
      [lotId, user.id, user.phone],
    );
    let reason: string | null = null;
    if (user.suspended) reason = "Your account is suspended.";
    else if (row?.is_seller) reason = "You consigned this watch.";
    else if (user.kyc_status !== "approved") reason = "Verify your identity to bid.";
    else if (!user.handle) reason = "Choose a public bidder handle to bid.";
    else if (user.bid_limit <= 0) reason = "Place a refundable deposit to set your bid limit.";
    viewer = {
      signed_in: true,
      leading: lot.leader_id === user.id,
      your_max: row?.your_max ?? null,
      can_bid: reason === null,
      reason,
      available_limit: Math.max(0, user.bid_limit - (row?.exposure ?? 0)),
    };
  }

  return {
    id: lot.id,
    phase,
    result: lot.result,
    starting_price: lot.starting_price,
    current_price: lot.current_price,
    min_next: minNextBid(lot.current_price, lot.starting_price),
    bid_count: lot.bid_count,
    ends_at: new Date(lot.ends_at).toISOString(),
    starts_at: new Date(lot.starts_at).toISOString(),
    has_reserve: lot.has_reserve,
    reserve_met: lot.reserve_met,
    leader_handle: lot.leader_handle,
    buyer_premium_bps: lot.buyer_premium_bps,
    buyer_premium_min: lot.buyer_premium_min,
    bids: bids.slice(0, 25).map((b) => ({ id: b.id, handle: b.handle, amount: b.amount, created_at: new Date(b.created_at).toISOString() })),
    server_time: new Date().toISOString(),
    viewer,
  };
}
