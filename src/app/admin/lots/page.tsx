import Link from "next/link";
import { closeDueLotsAction, extendLotAction, postAuctionSaleAction, publishLotAction } from "@/app/actions/admin";
import { query } from "@/lib/db";
import { formatPKR } from "@/lib/money";

const ERRORS: Record<string, string> = {
  not_in_custody: "That watch isn't in our custody yet. Record it as received on the watch page before publishing.",
  no_shill: "The consignor hasn't signed the no-shill agreement. Record it on the watch page before publishing.",
  post_sale: "Couldn't record the sale. Pick someone who bid on the lot and enter a price.",
};

export default async function AdminLots({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const unsoldBidders = await query<{ lot_id: string; bidder_id: string; handle: string | null; top: number }>(
    `select b.lot_id, b.bidder_id, u.handle, max(coalesce(b.max_amount, b.amount)) as top
       from bids b join lots l on l.id = b.lot_id join users u on u.id = b.bidder_id
      where l.status = 'closed' and l.result = 'unsold'
      group by b.lot_id, b.bidder_id, u.handle order by top desc`,
  );
  const lots = await query<{ id: string; lot_number: number; title: string; status: string; result: string | null; starting_price: number; reserve_price: number | null; current_price: number | null; leader_max: number | null; leader_handle: string | null; bid_count: number; starts_at: Date; ends_at: Date; watch_id: string; sold_via: string | null }>(
    `select l.id, l.lot_number, w.brand || ' ' || w.model as title, l.status, l.result, l.sold_via, l.starting_price, l.reserve_price,
            l.current_price, l.leader_max, u.handle as leader_handle, l.bid_count, l.starts_at, l.ends_at, l.watch_id
       from lots l join watches w on w.id = l.watch_id left join users u on u.id = l.leader_id
      order by (l.status = 'closed'), l.ends_at limit 300`,
  );
  const fmt = (d: Date) => new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "short", timeStyle: "short" });
  return (
    <>
      <h1>Lots</h1>
      {error && <div className="notice bad">{ERRORS[error] ?? "Something went wrong."}</div>}
      <form action={closeDueLotsAction} className="inline"><button className="secondary">Close due lots now</button></form>
      <span className="muted small"> Lots close automatically every minute via /api/cron/close-lots. This is a manual fallback.</span>
      <div className="table-wrap" style={{ marginTop: 12 }}><table className="data">
        <thead><tr><th>Lot</th><th>Status</th><th>Start / reserve</th><th>Price / leader max</th><th>Leader</th><th>Bids</th><th>Window (PKT)</th><th></th></tr></thead>
        <tbody>
          {lots.map((l) => (
            <tr key={l.id}>
              <td><Link href={`/lots/${l.id}`}>Lot {l.lot_number}</Link><div className="small"><Link href={`/admin/watches/${l.watch_id}`}>{l.title}</Link></div></td>
              <td>{l.status}{l.result ? ` · ${l.result}` : ""}{l.sold_via === "post_auction" ? " (after auction)" : ""}</td>
              <td>{formatPKR(l.starting_price)}<div className="muted small">{l.reserve_price ? formatPKR(l.reserve_price) : "no reserve"}</div></td>
              <td>{l.current_price ? formatPKR(l.current_price) : ""}<div className="muted small">{l.leader_max ? formatPKR(l.leader_max) : ""}</div></td>
              <td>{l.leader_handle ?? ""}</td>
              <td>{l.bid_count}</td>
              <td className="small">{fmt(l.starts_at)}<br />{fmt(l.ends_at)}</td>
              <td>
                {l.status === "closed" && l.result === "unsold" && unsoldBidders.some((b) => b.lot_id === l.id) && (
                  <form action={postAuctionSaleAction} className="inline" title="Record a deal agreed after the auction. It runs through the normal invoice, payment and handover.">
                    <input type="hidden" name="lot_id" value={l.id} />
                    <select name="buyer_id" aria-label="Buyer">
                      {unsoldBidders.filter((b) => b.lot_id === l.id).map((b) => (
                        <option key={b.bidder_id} value={b.bidder_id}>{b.handle ?? "bidder"} (max {formatPKR(b.top)})</option>
                      ))}
                    </select>
                    <input name="price" inputMode="numeric" placeholder="Agreed price" size={10} />
                    <button className="secondary">Record sale</button>
                  </form>
                )}
                {l.status === "draft" && <form action={publishLotAction} className="inline"><input type="hidden" name="lot_id" value={l.id} /><button>Publish</button></form>}
                {l.status === "published" && (
                  <form action={extendLotAction} className="inline">
                    <input type="hidden" name="lot_id" value={l.id} />
                    <input name="minutes" defaultValue="30" size={4} aria-label="Minutes" />
                    <button className="secondary">Extend (min)</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
