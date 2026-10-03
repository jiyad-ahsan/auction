import Link from "next/link";
import type { PublicLot } from "@/lib/lots";
import { formatPKR } from "@/lib/money";
import { fmtPktDateTime } from "@/lib/time";
import { Countdown } from "./Countdown";
import { WatchFace } from "./WatchFace";

export function ReserveBadge({ lot }: { lot: Pick<PublicLot, "has_reserve" | "reserve_met"> }) {
  if (!lot.has_reserve) return <span className="badge good">No reserve</span>;
  return lot.reserve_met ? <span className="badge good">Reserve met</span> : <span className="badge">Reserve not met</span>;
}

export function LotCard({ lot }: { lot: PublicLot }) {
  const closed = lot.status === "closed";
  const upcoming = new Date(lot.starts_at) > new Date();
  const title = `${lot.brand} ${lot.model}`;
  return (
    <Link href={`/lots/${lot.id}`} className="card">
      {lot.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="card-img" src={lot.cover_url} alt={title} />
      ) : (
        <div className="card-img"><WatchFace label={title} /></div>
      )}
      <div className="card-body">
        <span className="card-meta">Lot {lot.lot_number} · {lot.year ?? "Year unknown"} · Ref. {lot.reference}</span>
        <span className="card-title">{title}</span>
        {closed ? (
          <span>
            {lot.result === "sold" ? <>Sold for <span className="price">{formatPKR(lot.current_price!)}</span></> : <>Not sold{lot.current_price ? <> · high bid <span className="price">{formatPKR(lot.current_price)}</span></> : ""}</>}
          </span>
        ) : (
          <>
            <span>{lot.current_price ? "Bid " : "Starting "}<span className="price">{formatPKR(lot.current_price ?? lot.starting_price)}</span></span>
            <span className="muted small">
              {upcoming ? <>Opens {fmtPktDateTime(lot.starts_at)}</> : <><Countdown endsAt={new Date(lot.ends_at).toISOString()} /> · {lot.bid_count} bids</>}
            </span>
          </>
        )}
        <span className="tags" style={{ marginTop: 6 }}>
          {!closed && <ReserveBadge lot={lot} />}
          {lot.tags.map((t) => <span key={t.slug} className="tag">{t.label}</span>)}
        </span>
      </div>
    </Link>
  );
}
