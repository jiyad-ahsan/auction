import { notFound } from "next/navigation";
import { BidPanel } from "@/components/BidPanel";
import { PLACEHOLDER_IMG } from "@/components/LotCard";
import { currentUser } from "@/lib/auth";
import { lotState } from "@/lib/lotState";
import { authReport, GRADE_LABELS, lotMedia, publicLot } from "@/lib/lots";

export const dynamic = "force-dynamic";

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lot = await publicLot(id);
  if (!lot) notFound();
  const [media, report, state] = await Promise.all([lotMedia(lot.watch_id), authReport(lot.watch_id), lotState(id, await currentUser())]);

  const specs: [string, string | null][] = [
    ["Brand", lot.brand],
    ["Model", lot.model],
    ["Reference", lot.reference],
    ["Year", lot.year ? String(lot.year) : null],
    ["Case", [lot.case_material, lot.case_diameter_mm ? `${lot.case_diameter_mm} mm` : null].filter(Boolean).join(", ") || null],
    ["Movement", [lot.movement, lot.calibre].filter(Boolean).join(", calibre ") || null],
    ["Dial", lot.dial],
    ["Bracelet / strap", lot.bracelet],
    ["Box", lot.has_box ? "Yes" : "No"],
    ["Papers", lot.has_papers ? (lot.papers_date ? `Yes, dated ${new Date(lot.papers_date).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}` : "Yes") : "No"],
    ["Service history", lot.service_history],
  ];

  return (
    <>
      <p className="muted small">Lot {lot.lot_number}</p>
      <h1>{lot.brand} {lot.model} <span className="muted">Ref. {lot.reference}</span></h1>
      <div className="lot-layout">
        <div>
          <div className="gallery">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media[0]?.url ?? PLACEHOLDER_IMG} alt={media[0]?.alt ?? `${lot.brand} ${lot.model}`} />
            {media.length > 1 && (
              <div className="thumbs">
                {media.slice(1).map((m) => (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.alt ?? ""} loading="lazy" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {lot.description && (
            <>
              <h2>About this watch</h2>
              {lot.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </>
          )}

          <h2>Specifications</h2>
          <table className="specs"><tbody>
            {specs.filter(([, v]) => v).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}
          </tbody></table>

          {report && (
            <>
              <h2>Authentication &amp; condition report</h2>
              <p>
                <span className={`badge ${report.verdict === "authentic" ? "good" : "bad"}`}>{report.verdict === "authentic" ? "Authenticated" : report.verdict}</span>{" "}
                <span className="badge">Grade {GRADE_LABELS[report.condition_grade] ?? report.condition_grade}</span>
              </p>
              <p className="muted small">
                Inspected by {report.specialist} on {new Date(report.inspected_at).toLocaleDateString("en-GB", { dateStyle: "long" })}. Case opened and movement examined.
              </p>
              <table className="specs"><tbody>
                {report.case_notes && <tr><th>Case</th><td>{report.case_notes}</td></tr>}
                {report.dial_notes && <tr><th>Dial &amp; hands</th><td>{report.dial_notes}</td></tr>}
                {report.bracelet_notes && <tr><th>Bracelet / strap</th><td>{report.bracelet_notes}</td></tr>}
                {report.movement_notes && <tr><th>Movement</th><td>{report.movement_notes}</td></tr>}
                {report.rate_s_per_day !== null && (
                  <tr><th>Timegrapher (dial up)</th><td>{report.rate_s_per_day > 0 ? "+" : ""}{report.rate_s_per_day} s/day{report.amplitude_deg ? `, amplitude ${report.amplitude_deg}°` : ""}{report.beat_error_ms !== null ? `, beat error ${report.beat_error_ms} ms` : ""}</td></tr>
                )}
                {report.water_tested !== null && <tr><th>Water resistance test</th><td>{report.water_tested ? "Tested, passed" : "Not tested"}</td></tr>}
                <tr><th>Non-original parts</th><td>{report.aftermarket_parts || "None found"}</td></tr>
              </tbody></table>
              {report.checks.length > 0 && (
                <>
                  <h3>Checks performed</h3>
                  <ul className="checks">
                    {report.checks.map((c, i) => (
                      <li key={i}>
                        <span className={`badge ${c.result === "pass" ? "good" : c.result === "fail" ? "bad" : ""}`}>{c.result}</span>
                        <span>{c.name}{c.note ? <span className="muted">: {c.note}</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="notice small">
                <strong>Authenticity guarantee.</strong> If this watch is shown to be not authentic or materially
                misdescribed within 12 months of handover, we refund the full amount you paid.
              </div>
            </>
          )}
        </div>
        <div>{state && <BidPanel initial={state} />}</div>
      </div>
    </>
  );
}
