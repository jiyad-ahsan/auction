import Link from "next/link";
import type { PublicLot } from "@/lib/lots";
import { formatPKR } from "@/lib/money";
import { Countdown } from "./Countdown";
import { fmtPktDateTime } from "@/lib/time";

export const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e4ded3"/><circle cx="200" cy="150" r="70" fill="none" stroke="#b9ae9c" stroke-width="10"/><path d="M200 150 L200 105 M200 150 L232 168" stroke="#b9ae9c" stroke-width="8" stroke-linecap="round"/></svg>`,
  );

export function LotCard({ lot }: { lot: PublicLot }) {
  const closed = lot.status === "closed";
  const upcoming = new Date(lot.starts_at) > new Date();
  return (
    <Link href={`/lots/${lot.id}`} className="card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="card-img" src={lot.cover_url ?? PLACEHOLDER_IMG} alt={`${lot.brand} ${lot.model}`} />
      <div className="card-body">
        <span className="muted small">Lot {lot.lot_number} · {lot.year ?? "Year unknown"} · Ref. {lot.reference}</span>
        <span className="card-title">{lot.brand} {lot.model}</span>
        {closed ? (
          <span>
            {lot.result === "sold" ? <>Sold for <span className="price">{formatPKR(lot.current_price!)}</span></> : <>Not sold{lot.current_price ? ` · high bid ${formatPKR(lot.current_price)}` : ""}</>}
          </span>
        ) : (
          <>
            <span>
              {lot.current_price ? "Bid " : "Starting "}
              <span className="price">{formatPKR(lot.current_price ?? lot.starting_price)}</span>
            </span>
            <span className="muted small">
              {upcoming ? <>Opens {fmtPktDateTime(lot.starts_at)}</> : <><Countdown endsAt={new Date(lot.ends_at).toISOString()} /> · {lot.bid_count} bids</>}
            </span>
            <span>{!lot.has_reserve ? <span className="badge good">No reserve</span> : lot.reserve_met ? <span className="badge good">Reserve met</span> : <span className="badge">Reserve not met</span>}</span>
          </>
        )}
      </div>
    </Link>
  );
}
