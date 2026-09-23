import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { submitDepositAction, submitKycAction, updateProfileAction } from "@/app/actions/account";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { formatLakhCrore, formatPKR } from "@/lib/money";
import { maskPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  handle: "Handles are 3–20 characters: lowercase letters, numbers and underscores.",
  handle_taken: "That handle is taken.",
  kyc: "Enter your full name as on your CNIC and a 13-digit CNIC number.",
  deposit: "Enter an amount of at least PKR 50,000, the payment method and the transaction reference.",
};
const SAVED: Record<string, string> = {
  profile: "Profile saved.",
  kyc: "Thanks. Our team will verify your identity, usually within one business day.",
  deposit: "Deposit recorded. Your bid limit updates once we confirm the funds in our account.",
};

const fmtDate = (d: Date) => new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" });

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const { error, saved } = await searchParams;

  const [deposits, myLots, invoices, exposure] = await Promise.all([
    query<{ id: string; amount: number; method: string; reference: string; status: string; created_at: Date }>(
      "select id, amount, method, reference, status, created_at from deposits where user_id = $1 order by created_at desc",
      [user.id],
    ),
    query<{ id: string; lot_number: number; title: string; current_price: number; ends_at: Date; status: string; result: string | null; leading: boolean; my_max: number }>(
      `select l.id, l.lot_number, w.brand || ' ' || w.model as title, l.current_price, l.ends_at, l.status, l.result,
              l.leader_id = $1 as leading, max(b.max_amount) as my_max
         from bids b join lots l on l.id = b.lot_id join watches w on w.id = l.watch_id
        where b.bidder_id = $1
        group by l.id, w.brand, w.model
        order by l.ends_at desc limit 50`,
      [user.id],
    ),
    query<{ id: string; lot_id: string; lot_number: number; title: string; hammer: number; buyer_premium: number; total: number; due_at: Date; status: string; handed_over_at: Date | null }>(
      `select i.id, i.lot_id, l.lot_number, w.brand || ' ' || w.model as title, i.hammer, i.buyer_premium, i.total, i.due_at, i.status, i.handed_over_at
         from invoices i join lots l on l.id = i.lot_id join watches w on w.id = l.watch_id
        where i.buyer_id = $1 order by i.created_at desc`,
      [user.id],
    ),
    queryOne<{ e: number }>("select bidder_exposure($1, null) as e", [user.id]),
  ]);

  const bank = {
    title: process.env.DEPOSIT_ACCOUNT_TITLE ?? "(not configured)",
    bank: process.env.DEPOSIT_BANK ?? "",
    iban: process.env.DEPOSIT_IBAN ?? "",
    raast: process.env.DEPOSIT_RAAST_ID ?? "",
  };

  return (
    <>
      <h1>Your account</h1>
      <div className="muted" style={{ display: "flex", gap: 12, alignItems: "center" }}>{maskPhone(user.phone)} <form action={signOutAction} className="inline"><button className="secondary" type="submit">Sign out</button></form></div>
      {error && <div className="notice bad">{ERRORS[error] ?? "Something went wrong."}</div>}
      {saved && <div className="notice good">{SAVED[saved]}</div>}

      <div className="kpis">
        <div className="kpi"><span className="muted small">Identity</span><strong>{{ none: "Not verified", pending: "In review", approved: "Verified", rejected: "Action needed" }[user.kyc_status]}</strong></div>
        <div className="kpi"><span className="muted small">Bid limit</span><strong>{formatPKR(user.bid_limit)}</strong></div>
        <div className="kpi"><span className="muted small">Available to bid</span><strong>{formatPKR(Math.max(0, user.bid_limit - (exposure?.e ?? 0)))}</strong></div>
      </div>

      {invoices.length > 0 && (
        <>
          <h2>Purchases</h2>
          <div className="table-wrap"><table className="data">
            <thead><tr><th>Lot</th><th>Hammer</th><th>Premium</th><th>Total due</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td><Link href={`/lots/${i.lot_id}`}>Lot {i.lot_number}</Link> {i.title}</td>
                  <td>{formatPKR(i.hammer)}</td>
                  <td>{formatPKR(i.buyer_premium)}</td>
                  <td className="price">{formatPKR(i.total)}</td>
                  <td>
                    {i.status === "unpaid" ? <span className="badge warn">Pay by {fmtDate(i.due_at)}</span> : i.status === "paid" ? (i.handed_over_at ? <span className="badge good">Collected</span> : <span className="badge good">Paid, arrange handover</span>) : <span className="badge bad">{i.status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {invoices.some((i) => i.status === "unpaid") && (
            <div className="notice">
              Pay the total by Raast or IBFT to <strong>{bank.title}</strong>{bank.bank && <>, {bank.bank}</>}{bank.iban && <>, IBAN <strong>{bank.iban}</strong></>}{bank.raast && <>, Raast ID <strong>{bank.raast}</strong></>}. Use your lot number as the reference.
              We confirm receipt in our account (screenshots are not accepted as proof), then schedule your handover at our viewing room.
            </div>
          )}
        </>
      )}

      <h2>Your bids</h2>
      {myLots.length === 0 ? <p className="muted">You haven&apos;t bid yet.</p> : (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Lot</th><th>Current</th><th>Your max</th><th>Status</th></tr></thead>
          <tbody>
            {myLots.map((l) => (
              <tr key={l.id}>
                <td><Link href={`/lots/${l.id}`}>Lot {l.lot_number}</Link> {l.title}</td>
                <td>{formatPKR(l.current_price)}</td>
                <td>{formatPKR(l.my_max)}</td>
                <td>{l.status === "closed" ? (l.leading && l.result === "sold" ? <span className="badge good">Won</span> : <span className="badge">Closed</span>) : l.leading ? <span className="badge good">Leading</span> : <span className="badge bad">Outbid</span>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      <h2>1. Public profile</h2>
      <form action={updateProfileAction} className="stack">
        <label>
          Bidder handle (shown publicly instead of your name)
          <input name="handle" defaultValue={user.handle ?? ""} placeholder="e.g. tourbillon_lhr" required />
        </label>
        <label>
          Email (optional, for receipts)
          <input name="email" type="email" defaultValue={user.email ?? ""} />
        </label>
        <button type="submit">Save profile</button>
      </form>

      <h2>2. Verify your identity</h2>
      {user.kyc_status === "approved" ? (
        <p>Verified. CNIC ending {user.cnic_last4}.</p>
      ) : user.kyc_status === "pending" ? (
        <p>In review. CNIC ending {user.cnic_last4}. We may call or WhatsApp you from our official number to complete verification.</p>
      ) : (
        <>
          {user.kyc_status === "rejected" && <div className="notice bad">We couldn&apos;t verify your identity{user.kyc_notes ? `: ${user.kyc_notes}` : "."} Please resubmit.</div>}
          <form action={submitKycAction} className="stack">
            <label>Full name as on CNIC<input name="full_name" defaultValue={user.full_name ?? ""} required /></label>
            <label>CNIC number<input name="cnic" inputMode="numeric" placeholder="35202-1234567-1" required /></label>
            <p className="muted small">Your CNIC is encrypted and only visible to our verification team. We never show your name publicly.</p>
            <button type="submit">Submit for verification</button>
          </form>
        </>
      )}

      <h2>3. Deposit to set your bid limit</h2>
      <p>
        Your bid limit is 20× your confirmed deposit (the deposit is 5% of the limit, minimum PKR 50,000). For example, a PKR 150,000
        deposit lets you bid up to PKR 3,000,000 ({formatLakhCrore(3_000_000)}) across all lots you lead. Deposits are refundable
        on request if you have no open bids or unpaid purchases. If you win and don&apos;t pay within 3 business days, the deposit is forfeited.
      </p>
      <div className="notice">
        Transfer to <strong>{bank.title}</strong>{bank.bank && <>, {bank.bank}</>}{bank.iban && <>, IBAN <strong>{bank.iban}</strong></>}{bank.raast && <>, Raast ID <strong>{bank.raast}</strong></>}.
        This is a segregated client account; deposits are never used for operating costs.
      </div>
      <form action={submitDepositAction} className="stack">
        <div className="row">
          <label>Amount (PKR)<input name="amount" inputMode="numeric" placeholder="150000" required /></label>
          <label>
            Method
            <select name="method" defaultValue="raast">
              <option value="raast">Raast</option>
              <option value="ibft">IBFT / bank transfer</option>
              <option value="pay_order">Pay order</option>
            </select>
          </label>
        </div>
        <label>Transaction reference / pay order number<input name="reference" required /></label>
        <button type="submit">I&apos;ve sent the deposit</button>
      </form>
      {deposits.length > 0 && (
        <div className="table-wrap"><table className="data" style={{ marginTop: 16 }}>
          <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th></tr></thead>
          <tbody>
            {deposits.map((d) => (
              <tr key={d.id}><td>{fmtDate(d.created_at)}</td><td>{formatPKR(d.amount)}</td><td>{d.method}</td><td>{d.reference}</td><td>{d.status}</td></tr>
            ))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
