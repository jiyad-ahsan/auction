import { consignmentRequestStatusAction } from "@/app/actions/admin";
import { query } from "@/lib/db";
import { formatPKR } from "@/lib/money";

export default async function Consignments() {
  const rows = await query<{ id: string; name: string; phone: string; city: string | null; brand: string; model: string | null; reference: string | null; year: number | null; box_papers: string | null; expected_price: number | null; notes: string | null; status: string; created_at: Date }>(
    "select * from consignment_requests order by (status = 'new') desc, created_at desc limit 300",
  );
  return (
    <>
      <h1>Consignment enquiries</h1>
      <p className="muted">Call within one business day. Accepted watches are entered under Watches once they&apos;re physically with us.</p>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Date</th><th>Seller</th><th>Watch</th><th>Box/papers</th><th>Hopes for</th><th>Notes</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.created_at).toLocaleDateString("en-GB")}</td>
              <td>{r.name}<div className="muted small">{r.phone}{r.city ? ` · ${r.city}` : ""}</div></td>
              <td>{r.brand} {r.model}<div className="muted small">{r.reference}{r.year ? ` · ${r.year}` : ""}</div></td>
              <td>{r.box_papers}</td>
              <td>{r.expected_price ? formatPKR(r.expected_price) : ""}</td>
              <td className="small">{r.notes}</td>
              <td>
                <form action={consignmentRequestStatusAction} className="inline">
                  <input type="hidden" name="id" value={r.id} />
                  <select name="status" defaultValue={r.status}>
                    <option value="new">new</option><option value="contacted">contacted</option><option value="accepted">accepted</option><option value="declined">declined</option>
                  </select>
                  <button className="secondary">Save</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
