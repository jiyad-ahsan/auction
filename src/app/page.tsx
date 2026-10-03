import Link from "next/link";
import { LotCard } from "@/components/LotCard";
import { liveAndUpcomingLots, recentResults, tagsInUse } from "@/lib/lots";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const active = tag && /^[a-z0-9-]{2,40}$/.test(tag) ? tag : null;
  const [lots, results, tags] = await Promise.all([liveAndUpcomingLots(active), recentResults(4), tagsInUse()]);
  return (
    <>
      <section className="hero">
        <span className="eyebrow">Pakistan&apos;s auction house for fine watches</span>
        <h1>Every watch authenticated. Every bidder verified<span className="dot">.</span></h1>
        <div className="readout"><span>Rate <b>+2.5 s/d</b></span><span>Amplitude <b>285°</b></span><span>Beat error <b>0.2 ms</b></span><span>Parts <b>Original</b></span></div>
        <p>
          We hold every watch before it goes on sale, and our specialists open, measure and check it. Your payment is held
          safely until the watch is in your hands, and every purchase comes with a twelve-month authenticity guarantee.
        </p>
      </section>

      <h2>Live and upcoming</h2>
      {tags.length > 0 && (
        <nav className="filter" aria-label="Filter by tag">
          <Link href="/" className={`tag ${!active ? "active" : ""}`}>All</Link>
          {tags.map((t) => (
            <Link key={t.slug} href={`/?tag=${t.slug}`} className={`tag ${active === t.slug ? "active" : ""}`}>{t.label} · {t.n}</Link>
          ))}
        </nav>
      )}
      {lots.length === 0 ? (
        <p className="muted">{active ? "No live watches with this tag right now." : "No watches on the block right now. The next sale is being catalogued."}</p>
      ) : (
        <div className="grid">{lots.map((l) => <LotCard key={l.id} lot={l} />)}</div>
      )}

      {results.length > 0 && (
        <>
          <h2>Recent results</h2>
          <div className="grid">{results.map((l) => <LotCard key={l.id} lot={l} />)}</div>
          <p><Link href="/results">All results →</Link> <span className="muted small">Every final price is published. Buyers and sellers stay private.</span></p>
        </>
      )}
    </>
  );
}
