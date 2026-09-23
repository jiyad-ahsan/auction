import Link from "next/link";
import { LotCard } from "@/components/LotCard";
import { liveAndUpcomingLots, recentResults } from "@/lib/lots";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [lots, results] = await Promise.all([liveAndUpcomingLots(), recentResults(4)]);
  return (
    <>
      <section className="hero">
        <h1>Authenticated luxury watches, sold at auction.</h1>
        <p>
          Every watch is inspected and authenticated by our specialists before it is listed. Bidders are
          verified. Payment is held until you have the watch in hand. You get an authenticity guarantee.
        </p>
      </section>

      <h2>Live and upcoming</h2>
      {lots.length === 0 ? (
        <p className="muted">No watches on the block right now. The next sale is being catalogued.</p>
      ) : (
        <div className="grid">{lots.map((l) => <LotCard key={l.id} lot={l} />)}</div>
      )}

      {results.length > 0 && (
        <>
          <h2>Recent results</h2>
          <div className="grid">{results.map((l) => <LotCard key={l.id} lot={l} />)}</div>
          <p><Link href="/results">All results →</Link></p>
        </>
      )}
    </>
  );
}
