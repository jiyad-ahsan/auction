import { depositAction } from "@/app/actions/admin";
import { query } from "@/lib/db";
import { formatPKR } from "@/lib/money";

export default async function Deposits({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const rows = await query<{ id: string; amount: number; method: string; reference: string; status: string; created_at: Date; phone: string; full_name: string | null; handle: string | null; bid_limit: number }>(
    `select d.id, d.amount, d.method, d.reference, d.status, d.created_at, u.phone, u.full_name, u.handle, u.bid_limit
       from deposits d join users u on u.id = d.user_id
      order by (d.status = 'pending') desc, d.created_at desc limit 300`,
  );
  return (
    <>
      <h1>Deposits</h1>
      <p className="muted">Confirm a deposit only after you see the credit on the client-account bank statement. Screenshots are not proof.</p>
      {error && <div className="notice bad">{error}</div>}
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Date</th><th>Bidder</th><th>Amount</th><th>Method / ref</th><th>Status</th><th>Current limit</th><th></th></tr></thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td>{new Date(d.created_at).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}</td>
              <td>{d.full_name ?? d.phone}<div className="muted small">@{d.handle ?? "none"} · {d.phone}</div></td>
              <td className="price">{formatPKR(d.amount)}</td>
              <td>{d.method}<div className="muted small">{d.reference}</div></td>
              <td>{d.status}</td>
              <td>{formatPKR(d.bid_limit)}</td>
              <td>
                <form action={depositAction} className="inline">
                  <input type="hidden" name="deposit_id" value={d.id} />
                  {d.status === "pending" && <><button name="op" value="confirm">Confirm received</button><button name="op" value="reject" className="danger">Reject</button></>}
                  {d.status === "confirmed" && <><button name="op" value="refund" className="secondary">Mark refunded</button><button name="op" value="forfeit" className="danger">Forfeit</button></>}
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
