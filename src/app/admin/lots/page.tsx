import Link from "next/link";
import { closeDueLotsAction, extendLotAction, publishLotAction } from "@/app/actions/admin";
import { query } from "@/lib/db";
import { formatPKR } from "@/lib/money";

export default async function AdminLots() {
  const lots = await query<{ id: string; lot_number: number; title: string; status: string; result: string | null; starting_price: number; reserve_price: number | null; current_price: number | null; leader_max: number | null; leader_handle: string | null; bid_count: number; starts_at: Date; ends_at: Date; watch_id: string }>(
    `select l.id, l.lot_number, w.brand || ' ' || w.model as title, l.status, l.result, l.starting_price, l.reserve_price,
            l.current_price, l.leader_max, u.handle as leader_handle, l.bid_count, l.starts_at, l.ends_at, l.watch_id
       from lots l join watches w on w.id = l.watch_id left join users u on u.id = l.leader_id
      order by (l.status = 'closed'), l.ends_at limit 300`,
  );
  const fmt = (d: Date) => new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "short", timeStyle: "short" });
  return (
    <>
      <h1>Lots</h1>
      <form action={closeDueLotsAction} className="inline"><button className="secondary">Close due lots now</button></form>
      <span className="muted small"> Lots close automatically every minute via /api/cron/close-lots. This is a manual fallback.</span>
      <div className="table-wrap" style={{ marginTop: 12 }}><table className="data">
        <thead><tr><th>Lot</th><th>Status</th><th>Start / reserve</th><th>Price / leader max</th><th>Leader</th><th>Bids</th><th>Window (PKT)</th><th></th></tr></thead>
        <tbody>
          {lots.map((l) => (
            <tr key={l.id}>
              <td><Link href={`/lots/${l.id}`}>Lot {l.lot_number}</Link><div className="small"><Link href={`/admin/watches/${l.watch_id}`}>{l.title}</Link></div></td>
              <td>{l.status}{l.result ? ` · ${l.result}` : ""}</td>
              <td>{formatPKR(l.starting_price)}<div className="muted small">{l.reserve_price ? formatPKR(l.reserve_price) : "no reserve"}</div></td>
              <td>{l.current_price ? formatPKR(l.current_price) : ""}<div className="muted small">{l.leader_max ? formatPKR(l.leader_max) : ""}</div></td>
              <td>{l.leader_handle ?? ""}</td>
              <td>{l.bid_count}</td>
              <td className="small">{fmt(l.starts_at)}<br />{fmt(l.ends_at)}</td>
              <td>
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
