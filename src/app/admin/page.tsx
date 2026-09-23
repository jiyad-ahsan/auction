import Link from "next/link";
import { queryOne } from "@/lib/db";
import { formatPKR } from "@/lib/money";

export default async function AdminHome() {
  const s = await queryOne<Record<string, number>>(`
    select
      (select count(*)::int from consignment_requests where status = 'new') as new_requests,
      (select count(*)::int from watches where status in ('intake', 'authenticating')) as authenticating,
      (select count(*)::int from users where kyc_status = 'pending') as kyc_pending,
      (select count(*)::int from deposits where status = 'pending') as deposits_pending,
      (select count(*)::int from lots where status = 'published' and ends_at > now()) as live_lots,
      (select count(*)::int from lots where status = 'published' and ends_at <= now()) as due_to_close,
      (select count(*)::int from invoices where status = 'unpaid') as unpaid_invoices,
      (select count(*)::int from invoices i join settlements st on st.lot_id = i.lot_id
        where i.status = 'paid' and i.handed_over_at is not null and st.status = 'pending') as payouts_due,
      (select coalesce(sum(hammer), 0) from invoices where status in ('paid', 'unpaid')) as gmv,
      (select count(*)::int from lots where status = 'closed') as closed_lots,
      (select count(*)::int from lots where status = 'closed' and result = 'sold') as sold_lots
  `);
  const kpis: [string, string | number, string][] = [
    ["New consignment enquiries", s!.new_requests, "/admin/consignments"],
    ["Watches in authentication", s!.authenticating, "/admin/watches"],
    ["KYC to review", s!.kyc_pending, "/admin/kyc"],
    ["Deposits to confirm", s!.deposits_pending, "/admin/deposits"],
    ["Live lots", s!.live_lots, "/admin/lots"],
    ["Lots due to close", s!.due_to_close, "/admin/lots"],
    ["Unpaid invoices", s!.unpaid_invoices, "/admin/invoices"],
    ["Consignor payouts due", s!.payouts_due, "/admin/invoices"],
  ];
  const sellThrough = s!.closed_lots ? Math.round((100 * s!.sold_lots) / s!.closed_lots) : 0;
  return (
    <>
      <h1>Operations</h1>
      <div className="kpis">
        {kpis.map(([label, n, href]) => (
          <Link key={label} href={href} className="kpi"><span className="muted small">{label}</span><strong>{n}</strong></Link>
        ))}
      </div>
      <h2>Performance</h2>
      <div className="kpis">
        <div className="kpi"><span className="muted small">GMV (hammer, excl. defaults)</span><strong>{formatPKR(s!.gmv)}</strong></div>
        <div className="kpi"><span className="muted small">Sell-through</span><strong>{sellThrough}%</strong><span className="muted small">{s!.sold_lots} of {s!.closed_lots} closed lots</span></div>
      </div>
    </>
  );
}
