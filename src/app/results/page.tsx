import { LotCard } from "@/components/LotCard";
import { recentResults } from "@/lib/lots";

export const dynamic = "force-dynamic";

export default async function Results() {
  const results = await recentResults(200);
  return (
    <>
      <h1>Results</h1>
      <p className="muted">Every hammer price, published. Buyer and seller identities are never shown.</p>
      {results.length === 0 ? <p className="muted">No completed auctions yet.</p> : <div className="grid">{results.map((l) => <LotCard key={l.id} lot={l} />)}</div>}
    </>
  );
}
