import Link from "next/link";
import { invoiceAction, settlementPaidAction } from "@/app/actions/admin";
import { query } from "@/lib/db";
import { formatPKR } from "@/lib/money";

const ERRORS: Record<string, string> = {
  reference: "Enter the bank transaction reference.",
  settlement: "A consignor can only be paid after the buyer has paid and collected the watch.",
};

export default async function Invoices({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const rows = await query<{
    invoice_id: string; lot_id: string; lot_number: number; title: string; buyer: string; buyer_phone: string;
    hammer: number; buyer_premium: number; total: number; due_at: Date; status: string; paid_at: Date | null; payment_reference: string | null; handed_over_at: Date | null;
    settlement_id: string; consignor: string; seller_fee: number; net_payout: number; settlement_status: string; settlement_reference: string | null;
  }>(
    `select i.id as invoice_id, l.id as lot_id, l.lot_number, w.brand || ' ' || w.model as title,
            coalesce(u.full_name, u.handle) as buyer, u.phone as buyer_phone,
            i.hammer, i.buyer_premium, i.total, i.due_at, i.status, i.paid_at, i.payment_reference, i.handed_over_at,
            s.id as settlement_id, c.name as consignor, s.seller_fee, s.net_payout, s.status as settlement_status, s.reference as settlement_reference
       from invoices i
       join lots l on l.id = i.lot_id join watches w on w.id = l.watch_id
       join users u on u.id = i.buyer_id
       join settlements s on s.lot_id = i.lot_id join consignors c on c.id = s.consignor_id
      order by i.created_at desc limit 300`,
  );
  const fmt = (d: Date) => new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "short", timeStyle: "short" });
  return (
    <>
      <h1>Invoices &amp; payouts</h1>
      <p className="muted">
        Order of operations: confirm buyer funds on the client-account statement, then hand over at the viewing room (buyer inspects and signs),
        then pay the consignor.
      </p>
      {error && <div className="notice bad">{ERRORS[error]}</div>}
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Lot</th><th>Buyer</th><th>Amounts</th><th>Buyer payment</th><th>Handover</th><th>Consignor payout</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.invoice_id}>
              <td><Link href={`/lots/${r.lot_id}`}>Lot {r.lot_number}</Link><div className="small">{r.title}</div></td>
              <td>{r.buyer}<div className="muted small">{r.buyer_phone}</div></td>
              <td className="small">Hammer {formatPKR(r.hammer)}<br />Premium {formatPKR(r.buyer_premium)}<br /><strong>Due {formatPKR(r.total)}</strong></td>
              <td>
                {r.status === "unpaid" ? (
                  <>
                    <div className="small">Due {fmt(r.due_at)}</div>
                    <form action={invoiceAction} className="inline">
                      <input type="hidden" name="invoice_id" value={r.invoice_id} />
                      <select name="method" defaultValue="raast"><option value="raast">Raast</option><option value="ibft">IBFT</option><option value="pay_order">Pay order</option></select>
                      <input name="reference" placeholder="Bank ref" size={10} />
                      <button name="op" value="paid">Mark paid</button>
                      <button name="op" value="defaulted" className="danger">Default</button>
                    </form>
                  </>
                ) : r.status === "paid" ? <span className="small">Paid {fmt(r.paid_at!)}<br />{r.payment_reference}</span> : <span className="badge bad">{r.status}</span>}
              </td>
              <td>
                {r.handed_over_at ? <span className="small">{fmt(r.handed_over_at)}</span> : r.status === "paid" ? (
                  <form action={invoiceAction} className="inline">
                    <input type="hidden" name="invoice_id" value={r.invoice_id} />
                    <button name="op" value="handed_over" className="secondary">Mark collected</button>
                  </form>
                ) : ""}
              </td>
              <td className="small">
                {r.consignor}<br />Fee {formatPKR(r.seller_fee)} · Net <strong>{formatPKR(r.net_payout)}</strong><br />
                {r.settlement_status === "paid" ? <>Paid · {r.settlement_reference}</> : r.settlement_status === "void" ? "Void" : r.handed_over_at ? (
                  <form action={settlementPaidAction} className="inline">
                    <input type="hidden" name="settlement_id" value={r.settlement_id} />
                    <input name="reference" placeholder="Transfer ref" size={10} />
                    <button>Mark paid</button>
                  </form>
                ) : "Awaiting buyer payment & collection"}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
