import Link from "next/link";
import { queryOne } from "@/lib/db";
import { formatPKR } from "@/lib/money";
import { settings } from "@/lib/settings";

export default async function AdminHome() {
  const [s, cfg] = await Promise.all([
    queryOne<Record<string, number>>(`
      select
        (select count(*)::int from consignment_requests where status = 'new') as new_requests,
        (select count(*)::int from watches where status in ('intake', 'authenticating')) as authenticating,
        (select count(*)::int from watches where custody_status = 'with_consignor' and status not in ('rejected', 'returned')) as awaiting_custody,
        (select count(*)::int from watches where custody_status = 'in_custody') as in_custody,
        (select count(*)::int from users where kyc_status = 'pending') as kyc_pending,
        (select count(*)::int from deposits where status = 'pending') as deposits_pending,
        (select count(*)::int from lots where status = 'published' and ends_at > now()) as live_lots,
        (select count(*)::int from lots where status = 'published' and ends_at <= now()) as due_to_close,
        (select count(*)::int from invoices where status = 'unpaid') as unpaid_invoices,
        (select count(*)::int from invoices i join settlements st on st.lot_id = i.lot_id
          where i.status = 'paid' and i.handed_over_at is not null and st.status = 'pending') as payouts_due,
        (select coalesce(sum(hammer), 0) from invoices where status in ('paid', 'unpaid')) as gmv,
        (select count(*)::int from lots where status = 'closed') as closed_lots,
        (select count(*)::int from lots where status = 'closed' and result = 'sold') as sold_lots,
        (select count(*)::int from lots where status = 'closed' and sold_via = 'post_auction') as post_auction_sales,
        (select coalesce(round(avg(n), 1), 0) from (select count(distinct b.bidder_id) as n from lots l left join bids b on b.lot_id = l.id where l.status = 'closed' group by l.id) x) as bidders_per_lot,
        (select coalesce(round(avg(bid_count), 1), 0) from lots where status = 'closed') as bids_per_lot,
        (select count(*)::int from lots l where status = 'closed' and result = 'unsold' and exists (select 1 from bids b where b.lot_id = l.id)) as unsold_with_bids,
        (select count(*)::int from lots l where status = 'closed' and not exists (select 1 from bids b where b.lot_id = l.id)) as no_bid_lots
    `),
    settings(),
  ]);
  const kpis: [string, number, string][] = [
    ["New consignment enquiries", s!.new_requests, "/admin/consignments"],
    ["Watches in authentication", s!.authenticating, "/admin/watches"],
    ["Awaiting custody", s!.awaiting_custody, "/admin/watches"],
    ["KYC to review", s!.kyc_pending, "/admin/kyc"],
    ["Deposits to confirm", s!.deposits_pending, "/admin/deposits"],
    ["Lots due to close", s!.due_to_close, "/admin/lots"],
    ["Unpaid invoices", s!.unpaid_invoices, "/admin/invoices"],
    ["Consignor payouts due", s!.payouts_due, "/admin/invoices"],
  ];
  const sellThrough = s!.closed_lots ? Math.round((100 * s!.sold_lots) / s!.closed_lots) : 0;
  const baseline = cfg.baseline_sell_through_pct;
  return (
    <>
      <h1>Operations</h1>
      {cfg.pilot_mode && (
        <div className="notice">
          <strong>Pilot mode is on.</strong> Bidding needs a verified phone and email, bid limits are set by staff, and a CNIC is checked before collection.
          {cfg.invite_only && " Sign-up is invite-only."} <Link href="/admin/settings">Settings →</Link>
        </div>
      )}
      <div className="kpis">
        {kpis.map(([label, n, href]) => (
          <Link key={label} href={href} className={`kpi ${n > 0 ? "attn" : ""}`}><span className="muted small">{label}</span><strong>{n}</strong></Link>
        ))}
      </div>

      <h2>Pilot results</h2>
      <div className="kpis">
        <div className="kpi">
          <span className="muted small">Sell-through</span><strong>{sellThrough}%</strong>
          <span className="muted small">{s!.sold_lots} of {s!.closed_lots} closed lots{s!.post_auction_sales ? `, ${s!.post_auction_sales} after the auction` : ""}</span>
        </div>
        <div className="kpi">
          <span className="muted small">Seller&apos;s normal sell rate</span><strong>{baseline === null ? "Not set" : `${baseline}%`}</strong>
          <span className="muted small">{baseline === null ? <Link href="/admin/settings">Set the baseline →</Link> : sellThrough >= baseline ? "Auctions are ahead" : "Auctions are behind"}</span>
        </div>
        <div className="kpi"><span className="muted small">Bidders per closed lot</span><strong>{s!.bidders_per_lot}</strong></div>
        <div className="kpi"><span className="muted small">Bids per closed lot</span><strong>{s!.bids_per_lot}</strong></div>
        <div className="kpi"><span className="muted small">Unsold, but had bids</span><strong>{s!.unsold_with_bids}</strong><span className="muted small">Interest, price too high</span></div>
        <div className="kpi"><span className="muted small">Closed with no bids</span><strong>{s!.no_bid_lots}</strong><span className="muted small">No interest</span></div>
      </div>

      <h2>Money and stock</h2>
      <div className="kpis">
        <div className="kpi"><span className="muted small">GMV (final prices, excl. defaults)</span><strong>{formatPKR(s!.gmv)}</strong></div>
        <div className="kpi"><span className="muted small">Watches in our custody</span><strong>{s!.in_custody}</strong></div>
        <div className="kpi"><span className="muted small">Live lots</span><strong>{s!.live_lots}</strong></div>
      </div>
      <p className="muted small">Invite performance by WhatsApp group is on the <Link href="/admin/invites">Invites</Link> page.</p>
    </>
  );
}
