import Link from "next/link";
import { notFound } from "next/navigation";
import { addMediaAction, createLotAction, custodyAction, noShillAgreementAction, removeMediaAction, saveReportAction, setWatchTagsAction, updateWatchDescriptionAction } from "@/app/actions/admin";
import { query, queryOne } from "@/lib/db";
import { authReport, lotMedia } from "@/lib/lots";
import { formatPKR } from "@/lib/money";

const ERRORS: Record<string, string> = {
  media: "Image URLs must start with https://",
  not_authenticated: "Save an authentication report with verdict 'authentic' before creating a lot.",
  lot: "Check the prices and dates: reserve must be at least the starting price and the end after the start.",
  not_in_custody: "The watch must be received into our custody before its lot can be published. It was not created.",
  no_shill: "The consignor must sign the no-shill agreement before a lot can be published. It was not created.",
  location: "Enter where the watch is being kept.",
  return: "A watch can only be returned when it is in our custody, unsold and has no open lot.",
};

const CUSTODY_LABELS: Record<string, string> = {
  with_consignor: "With consignor, not yet received",
  in_custody: "In Nilaam custody",
  released_to_buyer: "Collected by buyer",
  returned_to_consignor: "Returned to consignor",
};

const DEFAULT_CHECKS = [
  "Reference matches case, dial and calibre | pass",
  "Serial engraving consistent with reference and year | pass",
  "Case back opened; movement matches calibre | pass",
  "Dial print, lume and hands original | pass",
  "Crystal, bezel and crown original | pass",
  "Bracelet/clasp codes consistent | pass",
  "Papers match serial | na",
  "Not listed on stolen-watch registers checked | pass",
].join("\n");

export default async function WatchDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const watch = await queryOne<Record<string, any>>(
    "select w.*, c.name as consignor_name, c.phone as consignor_phone, c.no_shill_agreed_at from watches w join consignors c on c.id = w.consignor_id where w.id = $1",
    [id],
  );
  if (!watch) notFound();
  const [media, report, lots, tags, events] = await Promise.all([
    lotMedia(id),
    authReport(id),
    query<{ id: string; lot_number: number; status: string; result: string | null; current_price: number | null }>(
      "select id, lot_number, status, result, current_price from lots where watch_id = $1 order by created_at desc",
      [id],
    ),
    query<{ id: string; label: string; active: boolean; on: boolean }>(
      `select t.id, t.label, t.active, exists (select 1 from watch_tags wt where wt.watch_id = $1 and wt.tag_id = t.id) as on
         from tags t order by t.label`,
      [id],
    ),
    query<{ event: string; location: string | null; note: string | null; created_at: Date; actor: string | null }>(
      `select e.event, e.location, e.note, e.created_at, coalesce(u.full_name, u.handle, u.phone) as actor
         from custody_events e left join users u on u.id = e.actor_id where e.watch_id = $1 order by e.created_at desc`,
      [id],
    ),
  ]);
  const hasOpenLot = lots.some((l) => l.status !== "closed");
  const checksText = report ? report.checks.map((c) => [c.name, c.result, c.note].filter(Boolean).join(" | ")).join("\n") : DEFAULT_CHECKS;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <p className="muted small"><Link href="/admin/watches">← Watches</Link></p>
      <h1>{watch.brand} {watch.model} <span className="muted">Ref. {watch.reference}</span></h1>
      <p>
        Status <strong>{watch.status}</strong> · Consignor {watch.consignor_name} ({watch.consignor_phone}) · Serial {watch.serial_private ?? "not recorded"}
      </p>
      {error && <div className="notice bad">{ERRORS[error]}</div>}

      {lots.length > 0 && (
        <p>Lots: {lots.map((l) => <span key={l.id}><Link href={`/lots/${l.id}`}>Lot {l.lot_number}</Link> ({l.status}{l.result ? `, ${l.result}` : ""}{l.current_price ? `, ${formatPKR(l.current_price)}` : ""}) </span>)}</p>
      )}

      <h2>Custody</h2>
      <p>
        <span className={`badge ${watch.custody_status === "in_custody" ? "good" : watch.custody_status === "with_consignor" ? "warn" : ""}`}>{CUSTODY_LABELS[watch.custody_status]}</span>
        {watch.custody_location && <> · Location: <strong>{watch.custody_location}</strong></>}
      </p>
      {watch.custody_status === "with_consignor" && (
        <form action={custodyAction} className="stack">
          <input type="hidden" name="watch_id" value={id} />
          <input type="hidden" name="op" value="received" />
          <div className="row">
            <label>Storage location<input name="location" placeholder="e.g. Lahore vault, safe 2" required /></label>
            <label>Note (condition on arrival, who delivered it)<input name="note" /></label>
          </div>
          <button>Record as received into custody</button>
        </form>
      )}
      {watch.custody_status === "in_custody" && (
        <div className="row" style={{ alignItems: "end" }}>
          <form action={custodyAction} className="inline">
            <input type="hidden" name="watch_id" value={id} />
            <input type="hidden" name="op" value="moved" />
            <input name="location" placeholder="New location" required aria-label="New location" />
            <button className="secondary">Record move</button>
          </form>
          {!hasOpenLot && watch.status !== "sold" && (
            <form action={custodyAction} className="inline">
              <input type="hidden" name="watch_id" value={id} />
              <input type="hidden" name="op" value="returned" />
              <input name="note" placeholder="Reason (optional)" aria-label="Reason for return" />
              <button className="danger">Return to consignor</button>
            </form>
          )}
        </div>
      )}
      {events.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 12 }}><table className="data">
          <thead><tr><th>When</th><th>Event</th><th>Location</th><th>Note</th><th>By</th></tr></thead>
          <tbody>{events.map((e, i) => (
            <tr key={i}><td className="small">{new Date(e.created_at).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}</td><td>{e.event.replace(/_/g, " ")}</td><td>{e.location ?? ""}</td><td className="small">{e.note ?? ""}</td><td className="small">{e.actor ?? ""}</td></tr>
          ))}</tbody>
        </table></div>
      )}

      <h2>No-shill agreement</h2>
      {watch.no_shill_agreed_at ? (
        <p><span className="badge good">Signed</span> {watch.consignor_name} agreed on {new Date(watch.no_shill_agreed_at).toLocaleDateString("en-GB", { dateStyle: "long" })} that nobody connected to them will bid on their watches.</p>
      ) : (
        <form action={noShillAgreementAction} className="stack">
          <input type="hidden" name="watch_id" value={id} />
          <input type="hidden" name="consignor_id" value={watch.consignor_id} />
          <p className="muted">Required before any of this consignor&apos;s lots can be published. Record it once the signed agreement is on file.</p>
          <button className="secondary">Record signed agreement</button>
        </form>
      )}

      <h2>Tags</h2>
      <form action={setWatchTagsAction} className="stack" style={{ maxWidth: 720 }}>
        <input type="hidden" name="watch_id" value={id} />
        <div className="tags">
          {tags.filter((t) => t.active || t.on).map((t) => (
            <label key={t.id} className="checkrow tag" style={{ padding: "4px 8px" }}>
              <input type="checkbox" name="tag_id" value={t.id} defaultChecked={t.on} /> {t.label}
            </label>
          ))}
        </div>
        <span className="muted small">Manage the tag list under <Link href="/admin/tags">Tags</Link>.</span>
        <button className="secondary">Save tags</button>
      </form>

      <h2>Catalogue text</h2>
      <form action={updateWatchDescriptionAction} className="stack" style={{ maxWidth: 720 }}>
        <input type="hidden" name="watch_id" value={id} />
        <label>Service history<input name="service_history" defaultValue={watch.service_history ?? ""} /></label>
        <label>Description<textarea name="description" defaultValue={watch.description ?? ""} rows={6} /></label>
        <button className="secondary">Save text</button>
      </form>

      <h2>Photos</h2>
      <p className="muted small">Studio photos only. Strip EXIF/GPS before upload. Never photograph at the consignor&apos;s home.</p>
      <div className="grid">
        {media.map((m) => (
          <div key={m.id} className="card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="card-img" src={m.url} alt={m.alt ?? ""} />
            <form action={removeMediaAction} className="card-body">
              <input type="hidden" name="watch_id" value={id} />
              <input type="hidden" name="media_id" value={m.id} />
              <button className="danger">Remove</button>
            </form>
          </div>
        ))}
      </div>
      <form action={addMediaAction} className="inline" style={{ marginTop: 12 }}>
        <input type="hidden" name="watch_id" value={id} />
        <input name="url" placeholder="https://… image URL" required style={{ minWidth: 320 }} />
        <input name="alt" placeholder="Description (alt text)" />
        <button className="secondary">Add photo</button>
      </form>

      <h2>Authentication &amp; condition report</h2>
      <form action={saveReportAction} className="stack" style={{ maxWidth: 720 }}>
        <input type="hidden" name="watch_id" value={id} />
        <div className="row">
          <label>Specialist<input name="specialist" defaultValue={report?.specialist ?? ""} required /></label>
          <label>Inspected on<input type="date" name="inspected_at" defaultValue={report ? new Date(report.inspected_at).toISOString().slice(0, 10) : today} required /></label>
          <label>
            Verdict
            <select name="verdict" defaultValue={report?.verdict ?? "authentic"}>
              <option value="authentic">Authentic</option><option value="inconclusive">Inconclusive</option><option value="not_authentic">Not authentic</option>
            </select>
          </label>
          <label>
            Condition grade
            <select name="condition_grade" defaultValue={report?.condition_grade ?? "A"}>
              <option value="S">S: Unworn</option><option value="A">A: Excellent</option><option value="B">B: Very good</option><option value="C">C: Good</option><option value="D">D: Fair</option>
            </select>
          </label>
        </div>
        <label>Case<input name="case_notes" defaultValue={report?.case_notes ?? ""} /></label>
        <label>Dial &amp; hands<input name="dial_notes" defaultValue={report?.dial_notes ?? ""} /></label>
        <label>Bracelet / strap<input name="bracelet_notes" defaultValue={report?.bracelet_notes ?? ""} /></label>
        <label>Movement<input name="movement_notes" defaultValue={report?.movement_notes ?? ""} /></label>
        <div className="row">
          <label>Rate (s/day)<input name="rate_s_per_day" inputMode="decimal" defaultValue={report?.rate_s_per_day ?? ""} /></label>
          <label>Amplitude (°)<input name="amplitude_deg" inputMode="numeric" defaultValue={report?.amplitude_deg ?? ""} /></label>
          <label>Beat error (ms)<input name="beat_error_ms" inputMode="decimal" defaultValue={report?.beat_error_ms ?? ""} /></label>
          <label>
            Water test
            <select name="water_tested" defaultValue={report?.water_tested === null || report?.water_tested === undefined ? "" : report.water_tested ? "yes" : "no"}>
              <option value="">Not recorded</option><option value="yes">Tested, passed</option><option value="no">Not tested</option>
            </select>
          </label>
        </div>
        <label>Non-original parts (blank = none found)<input name="aftermarket_parts" defaultValue={report?.aftermarket_parts ?? ""} /></label>
        <label>
          Checks (one per line: name | pass/fail/na | note)
          <textarea name="checks" rows={9} defaultValue={checksText} />
        </label>
        <button>Save report</button>
      </form>

      <h2>Create lot</h2>
      {hasOpenLot ? <p className="muted">This watch already has an open lot.</p> : report?.verdict !== "authentic" ? <p className="muted">Save an authentic verdict first.</p> : (
        <form action={createLotAction} className="stack" style={{ maxWidth: 720 }}>
          <input type="hidden" name="watch_id" value={id} />
          <div className="row">
            <label>Starting price (PKR)<input name="starting_price" inputMode="numeric" required /></label>
            <label>Reserve (PKR, blank = no reserve)<input name="reserve_price" inputMode="numeric" /></label>
          </div>
          <div className="row">
            <label>Opens (PKT)<input type="datetime-local" name="starts_at" required /></label>
            <label>Ends (PKT)<input type="datetime-local" name="ends_at" required /></label>
          </div>
          <label>
            Late-bid extension (minutes)
            <input name="extension_minutes" inputMode="numeric" defaultValue={5} />
            <span className="muted small">A bid in the final N minutes extends the lot by N minutes.</span>
          </label>
          {(watch.custody_status !== "in_custody" || !watch.no_shill_agreed_at) && (
            <div className="notice small">You can save this as a draft now. Publishing needs the watch in custody and the signed no-shill agreement.</div>
          )}
          <label className="checkrow"><input type="checkbox" name="publish" /> Publish now (otherwise saved as draft)</label>
          <button>Create lot</button>
        </form>
      )}
    </>
  );
}
