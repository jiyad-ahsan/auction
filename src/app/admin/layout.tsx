import Link from "next/link";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <>
      <nav className="nav" style={{ margin: "0 0 16px", paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
        <Link href="/admin">Overview</Link>
        <Link href="/admin/consignments">Consignments</Link>
        <Link href="/admin/watches">Watches</Link>
        <Link href="/admin/lots">Lots</Link>
        <Link href="/admin/kyc">Bidders &amp; KYC</Link>
        <Link href="/admin/deposits">Deposits</Link>
        <Link href="/admin/invoices">Invoices &amp; payouts</Link>
      </nav>
      {children}
    </>
  );
}
