import { query, queryOne } from "./db";

// Public projection of a lot. Never select reserve_price, leader_max, serials or
// consignor details into this shape.
export type PublicLot = {
  id: string;
  lot_number: number;
  status: "draft" | "published" | "closed";
  result: "sold" | "unsold" | null;
  starting_price: number;
  current_price: number | null;
  has_reserve: boolean;
  reserve_met: boolean;
  starts_at: Date;
  ends_at: Date;
  bid_count: number;
  leader_id: string | null;
  leader_handle: string | null;
  buyer_premium_bps: number;
  buyer_premium_min: number;
  watch_id: string;
  brand: string;
  model: string;
  reference: string;
  year: number | null;
  case_material: string | null;
  case_diameter_mm: number | null;
  movement: string | null;
  calibre: string | null;
  dial: string | null;
  bracelet: string | null;
  has_box: boolean;
  has_papers: boolean;
  papers_date: Date | null;
  service_history: string | null;
  description: string | null;
  cover_url: string | null;
};

const PUBLIC_LOT_SELECT = `
  select l.id, l.lot_number, l.status, l.result, l.starting_price, l.current_price,
         l.reserve_price is not null as has_reserve,
         (l.reserve_price is null or coalesce(l.current_price, 0) >= l.reserve_price) as reserve_met,
         l.starts_at, l.ends_at, l.bid_count, l.leader_id, u.handle as leader_handle,
         l.buyer_premium_bps, l.buyer_premium_min,
         w.id as watch_id, w.brand, w.model, w.reference, w.year, w.case_material, w.case_diameter_mm,
         w.movement, w.calibre, w.dial, w.bracelet, w.has_box, w.has_papers, w.papers_date,
         w.service_history, w.description,
         (select url from media m where m.watch_id = w.id order by position limit 1) as cover_url
    from lots l
    join watches w on w.id = l.watch_id
    left join users u on u.id = l.leader_id`;

export async function liveAndUpcomingLots(): Promise<PublicLot[]> {
  return query<PublicLot>(`${PUBLIC_LOT_SELECT} where l.status = 'published' order by l.ends_at`);
}

export async function recentResults(limit = 50): Promise<PublicLot[]> {
  return query<PublicLot>(`${PUBLIC_LOT_SELECT} where l.status = 'closed' order by l.closed_at desc limit $1`, [limit]);
}

export async function publicLot(id: string): Promise<PublicLot | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<PublicLot>(`${PUBLIC_LOT_SELECT} where l.id = $1 and l.status <> 'draft'`, [id]);
}

export type PublicBid = { id: number; handle: string | null; amount: number; kind: string; created_at: Date };

export async function publicBids(lotId: string): Promise<PublicBid[]> {
  return query<PublicBid>(
    `select b.id, u.handle, b.amount, b.kind, b.created_at
       from bids b join users u on u.id = b.bidder_id
      where b.lot_id = $1 and b.kind <> 'max_increase'
      order by b.id desc limit 100`,
    [lotId],
  );
}

export type Media = { id: string; url: string; alt: string | null };

export async function lotMedia(watchId: string): Promise<Media[]> {
  return query<Media>("select id, url, alt from media where watch_id = $1 order by position", [watchId]);
}

export type AuthReport = {
  specialist: string;
  inspected_at: Date;
  verdict: string;
  condition_grade: string;
  case_notes: string | null;
  dial_notes: string | null;
  bracelet_notes: string | null;
  movement_notes: string | null;
  rate_s_per_day: number | null;
  amplitude_deg: number | null;
  beat_error_ms: number | null;
  water_tested: boolean | null;
  aftermarket_parts: string | null;
  checks: { name: string; result: "pass" | "fail" | "na"; note?: string }[];
};

export async function authReport(watchId: string): Promise<AuthReport | null> {
  return queryOne<AuthReport>("select * from authentication_reports where watch_id = $1", [watchId]);
}

export function lotPhase(lot: Pick<PublicLot, "status" | "starts_at" | "ends_at">, now = new Date()) {
  if (lot.status === "closed") return "closed";
  if (now < new Date(lot.starts_at)) return "upcoming";
  if (now >= new Date(lot.ends_at)) return "ending"; // awaiting close job
  return "live";
}

export const GRADE_LABELS: Record<string, string> = {
  S: "S: Unworn / as new",
  A: "A: Excellent",
  B: "B: Very good",
  C: "C: Good, visible wear",
  D: "D: Fair, needs work",
};
