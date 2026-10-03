import { createInviteAction, toggleInviteAction } from "@/app/actions/admin";
import { query } from "@/lib/db";
import { formatPKR } from "@/lib/money";

const ERRORS: Record<string, string> = {
  invite: "Give the invite a name (e.g. the WhatsApp group) and a code of at least 4 letters or numbers.",
  invite_exists: "That code is already in use. Choose another.",
};

export default async function Invites({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const base = process.env.APP_URL ?? "";
  const rows = await query<{
    id: string; code: string; label: string; default_bid_limit: number; max_uses: number | null; uses: number; active: boolean; created_at: Date;
    members: number; bidders: number; bids: number; winners: number; gmv: number;
  }>(
    `select i.*,
            (select count(*)::int from users u where u.invite_id = i.id) as members,
            (select count(distinct b.bidder_id)::int from bids b join users u on u.id = b.bidder_id where u.invite_id = i.id) as bidders,
            (select count(*)::int from bids b join users u on u.id = b.bidder_id where u.invite_id = i.id and b.kind = 'manual') as bids,
            (select count(distinct inv.buyer_id)::int from invoices inv join users u on u.id = inv.buyer_id where u.invite_id = i.id and inv.status <> 'void') as winners,
            (select coalesce(sum(inv.hammer), 0) from invoices inv join users u on u.id = inv.buyer_id where u.invite_id = i.id and inv.status in ('paid', 'unpaid')) as gmv
       from invites i order by i.created_at desc`,
  );
  return (
    <>
      <h1>Invites</h1>
      <p className="muted">Create one invite per WhatsApp group or channel and share its link there. New members start with the invite&apos;s bid limit, and you can see which groups bring real bidders.</p>
      {error && <div className="notice bad">{ERRORS[error]}</div>}
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Invite</th><th>Link</th><th>Starting limit</th><th>Used</th><th>Members</th><th>Bidders</th><th>Bids</th><th>Winners</th><th>GMV</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.label}<div className="muted small mono">{r.code}</div></td>
              <td className="mono small" style={{ userSelect: "all" }}>{base}/join/{r.code}</td>
              <td className="num">{formatPKR(r.default_bid_limit)}</td>
              <td className="num">{r.uses}{r.max_uses ? ` / ${r.max_uses}` : ""}</td>
              <td className="num">{r.members}</td>
              <td className="num">{r.bidders}</td>
              <td className="num">{r.bids}</td>
              <td className="num">{r.winners}</td>
              <td className="num">{formatPKR(r.gmv)}</td>
              <td>
                <form action={toggleInviteAction} className="inline">
                  <input type="hidden" name="invite_id" value={r.id} />
                  <button className={r.active ? "danger" : "secondary"}>{r.active ? "Turn off" : "Turn on"}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <h2>New invite</h2>
      <form action={createInviteAction} className="stack">
        <label>Name<input name="label" placeholder="WhatsApp: Vintage Watches Lahore" required /></label>
        <div className="row">
          <label>Code (optional)<input name="code" placeholder="LHR-VINTAGE" /></label>
          <label>Starting bid limit (PKR)<input name="default_bid_limit" inputMode="numeric" defaultValue={1000000} /></label>
          <label>Max sign-ups (optional)<input name="max_uses" inputMode="numeric" /></label>
        </div>
        <button>Create invite</button>
      </form>
    </>
  );
}
