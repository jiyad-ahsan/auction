import type { Metadata } from "next";
import Link from "next/link";
import { THEME_INIT, ThemeToggle } from "@/components/ThemeToggle";
import { currentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nilaam: authenticated watch auctions",
  description: "Pakistan's auction house for fine watches. Every watch authenticated, every bidder verified.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const isStaff = user?.role === "admin" || user?.role === "staff";
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" />
      </head>
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand" aria-label="Nilaam home">
              <span className="brand-word">NILAAM<span className="dot">.</span></span>
              <span className="brand-sub">Authenticated watch auctions</span>
            </Link>
            <div className="header-right">
              <nav className="nav" aria-label="Main">
                <Link href="/">Auctions</Link>
                <Link href="/results">Results</Link>
                <Link href="/how-it-works">How it works</Link>
                <Link href="/consign">Sell a watch</Link>
                {user ? <Link href="/account">Account</Link> : <Link href="/login">Sign in</Link>}
                {isStaff && <Link href="/admin">Admin</Link>}
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <span>Nilaam · Every watch authenticated before it goes on sale. Prices in Pakistani rupees. <Link href="/how-it-works">Rules &amp; guarantee</Link></span>
            <span className="mono">Lahore · Karachi · Islamabad</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
