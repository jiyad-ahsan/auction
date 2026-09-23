import Link from "next/link";
import { createWatchAction } from "@/app/actions/admin";
import { query } from "@/lib/db";

const ERRORS: Record<string, string> = {
  consignor: "Choose an existing consignor or enter a new consignor's name and mobile number.",
  watch: "Brand, model and reference are required.",
};

export default async function Watches({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [watches, consignors] = await Promise.all([
    query<{ id: string; brand: string; model: string; reference: string; year: number | null; status: string; consignor: string; created_at: Date }>(
      `select w.id, w.brand, w.model, w.reference, w.year, w.status, c.name as consignor, w.created_at
         from watches w join consignors c on c.id = w.consignor_id order by w.created_at desc limit 300`,
    ),
    query<{ id: string; name: string; phone: string }>("select id, name, phone from consignors order by name"),
  ]);
  return (
    <>
      <h1>Watches</h1>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Watch</th><th>Consignor</th><th>Status</th><th>Received</th></tr></thead>
        <tbody>
          {watches.map((w) => (
            <tr key={w.id}>
              <td><Link href={`/admin/watches/${w.id}`}>{w.brand} {w.model}</Link><div className="muted small">Ref. {w.reference}{w.year ? ` · ${w.year}` : ""}</div></td>
              <td>{w.consignor}</td>
              <td>{w.status}</td>
              <td>{new Date(w.created_at).toLocaleDateString("en-GB")}</td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <h2>Intake a watch</h2>
      {error && <div className="notice bad">{ERRORS[error]}</div>}
      <form action={createWatchAction} className="stack" style={{ maxWidth: 720 }}>
        <fieldset className="stack">
          <legend>Consignor</legend>
          <label>
            Existing consignor
            <select name="consignor_id" defaultValue="">
              <option value="">New consignor…</option>
              {consignors.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </label>
          <div className="row">
            <label>New consignor name<input name="consignor_name" /></label>
            <label>Mobile<input name="consignor_phone" type="tel" /></label>
            <label>CNIC last 4<input name="consignor_cnic_last4" maxLength={4} /></label>
          </div>
          <label>Consignor notes (private)<input name="consignor_notes" /></label>
        </fieldset>
        <div className="row">
          <label>Brand<input name="brand" required /></label>
          <label>Model<input name="model" required /></label>
          <label>Reference<input name="reference" required /></label>
        </div>
        <div className="row">
          <label>Serial (private)<input name="serial_private" /></label>
          <label>Year<input name="year" inputMode="numeric" /></label>
          <label>Case material<input name="case_material" placeholder="Oystersteel" /></label>
          <label>Diameter (mm)<input name="case_diameter_mm" inputMode="decimal" /></label>
        </div>
        <div className="row">
          <label>
            Movement
            <select name="movement" defaultValue="automatic"><option value="automatic">Automatic</option><option value="manual">Manual wind</option><option value="quartz">Quartz</option></select>
          </label>
          <label>Calibre<input name="calibre" /></label>
          <label>Dial<input name="dial" /></label>
          <label>Bracelet / strap<input name="bracelet" /></label>
        </div>
        <div className="row">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="has_box" style={{ width: "auto" }} /> Box</label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="has_papers" style={{ width: "auto" }} /> Papers</label>
          <label>Papers date<input type="date" name="papers_date" /></label>
        </div>
        <label>Service history<input name="service_history" /></label>
        <label>Catalogue description<textarea name="description" /></label>
        <button type="submit">Create and start authentication</button>
      </form>
    </>
  );
}
