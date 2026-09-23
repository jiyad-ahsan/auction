import { reviewKycAction, setSuspendedAction } from "@/app/actions/admin";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { query } from "@/lib/db";
import { formatPKR } from "@/lib/money";

export default async function Kyc() {
  const staff = await requireStaff();
  const pending = await query<{ id: string; phone: string; full_name: string; cnic_encrypted: string; kyc_submitted_at: Date; handle: string | null }>(
    "select id, phone, full_name, cnic_encrypted, kyc_submitted_at, handle from users where kyc_status = 'pending' order by kyc_submitted_at",
  );
  if (pending.length) await audit(staff.id, "kyc.viewed", "user", null, { user_ids: pending.map((p) => p.id) });
  const bidders = await query<{ id: string; phone: string; full_name: string | null; handle: string | null; kyc_status: string; bid_limit: number; suspended: boolean; created_at: Date }>(
    "select id, phone, full_name, handle, kyc_status, bid_limit, suspended, created_at from users order by created_at desc limit 200",
  );
  return (
    <>
      <h1>Bidders &amp; KYC</h1>
      <p className="muted">
        Verify each CNIC against NADRA (Verisys via our bank partner, or e-Sahulat) and confirm the name matches.
        Do a short WhatsApp video call with the physical CNIC for bid limits above PKR 5M.
      </p>
      <h2>Pending review ({pending.length})</h2>
      {pending.length === 0 ? <p className="muted">Nothing to review.</p> : (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Submitted</th><th>Name</th><th>CNIC</th><th>Phone</th><th>Decision</th></tr></thead>
          <tbody>
            {pending.map((u) => (
              <tr key={u.id}>
                <td>{new Date(u.kyc_submitted_at).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}</td>
                <td>{u.full_name}<div className="muted small">@{u.handle ?? "no handle"}</div></td>
                <td>{decrypt(u.cnic_encrypted).replace(/^(\d{5})(\d{7})(\d)$/, "$1-$2-$3")}</td>
                <td>{u.phone}</td>
                <td>
                  <form action={reviewKycAction} className="inline">
                    <input type="hidden" name="user_id" value={u.id} />
                    <input name="notes" placeholder="Notes (shown to bidder if rejected)" />
                    <button name="decision" value="approved">Approve</button>
                    <button name="decision" value="rejected" className="danger">Reject</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      <h2>All users</h2>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Joined</th><th>Handle</th><th>Name</th><th>Phone</th><th>KYC</th><th>Bid limit</th><th></th></tr></thead>
        <tbody>
          {bidders.map((u) => (
            <tr key={u.id}>
              <td>{new Date(u.created_at).toLocaleDateString("en-GB")}</td>
              <td>{u.handle ?? "none"}</td>
              <td>{u.full_name ?? ""}</td>
              <td>{u.phone}</td>
              <td>{u.kyc_status}</td>
              <td>{formatPKR(u.bid_limit)}</td>
              <td>
                <form action={setSuspendedAction} className="inline">
                  <input type="hidden" name="user_id" value={u.id} />
                  <input type="hidden" name="suspended" value={String(!u.suspended)} />
                  <button className={u.suspended ? "secondary" : "danger"}>{u.suspended ? "Unsuspend" : "Suspend"}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
