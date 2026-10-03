import { reviewKycAction, setAssignedLimitAction, setSuspendedAction } from "@/app/actions/admin";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { query } from "@/lib/db";
import { formatPKR } from "@/lib/money";

export default async function Kyc({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const staff = await requireStaff();
  const pending = await query<{ id: string; phone: string; full_name: string; cnic_encrypted: string; kyc_submitted_at: Date; handle: string | null }>(
    "select id, phone, full_name, cnic_encrypted, kyc_submitted_at, handle from users where kyc_status = 'pending' order by kyc_submitted_at",
  );
  if (pending.length) await audit(staff.id, "kyc.viewed", "user", null, { user_ids: pending.map((p) => p.id) });
  const bidders = await query<{ id: string; phone: string; full_name: string | null; handle: string | null; email: string | null; email_verified: boolean; kyc_status: string; bid_limit: number; assigned_limit: number; suspended: boolean; created_at: Date; invite: string | null }>(
    `select u.id, u.phone, u.full_name, u.handle, u.email, u.email_verified_at is not null as email_verified, u.kyc_status,
            u.bid_limit, u.assigned_limit, u.suspended, u.created_at, i.label as invite
       from users u left join invites i on i.id = u.invite_id
      order by u.created_at desc limit 300`,
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
      <h2>All members</h2>
      <p className="muted small">In pilot mode the staff-assigned limit is what lets someone bid. Confirmed deposits add 20× on top.</p>
      {error === "limit" && <div className="notice bad">Enter a bid limit of zero or more.</div>}
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Joined</th><th>Handle</th><th>Name / phone</th><th>Invited via</th><th>Email</th><th>CNIC</th><th>Assigned limit</th><th>Total limit</th><th></th></tr></thead>
        <tbody>
          {bidders.map((u) => (
            <tr key={u.id}>
              <td>{new Date(u.created_at).toLocaleDateString("en-GB")}</td>
              <td>{u.handle ?? "none"}</td>
              <td>{u.full_name ?? ""}<div className="muted small">{u.phone}</div></td>
              <td className="small">{u.invite ?? ""}</td>
              <td>{u.email_verified ? <span className="badge good">Verified</span> : <span className="badge">{u.email ? "Unverified" : "None"}</span>}</td>
              <td>{u.kyc_status === "approved" ? <span className="badge good">Verified</span> : <span className="badge">{u.kyc_status}</span>}</td>
              <td>
                <form action={setAssignedLimitAction} className="inline">
                  <input type="hidden" name="user_id" value={u.id} />
                  <input name="assigned_limit" inputMode="numeric" defaultValue={u.assigned_limit} size={10} aria-label="Assigned bid limit (PKR)" />
                  <button className="secondary">Set</button>
                </form>
              </td>
              <td className="num">{formatPKR(u.bid_limit)}</td>
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
