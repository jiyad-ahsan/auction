import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auction House: Authenticated Watches",
  description: "Curated, authenticated luxury watch auctions in Pakistan.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const isStaff = user?.role === "admin" || user?.role === "staff";
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">Auction House</Link>
            <nav className="nav">
              <Link href="/">Auctions</Link>
              <Link href="/results">Results</Link>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/consign">Sell a watch</Link>
              {user ? <Link href="/account">Account</Link> : <Link href="/login">Sign in</Link>}
              {isStaff && <Link href="/admin">Admin</Link>}
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            Every watch authenticated by our specialists before listing. Prices in PKR.
            Buyer&apos;s premium applies. <Link href="/how-it-works">Terms &amp; guarantee</Link>.
          </div>
        </footer>
      </body>
    </html>
  );
}
