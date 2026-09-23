// Sample data for local development only. Refuses to run with NODE_ENV=production.
import pg from "pg";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const WATCHES = [
  { brand: "Rolex", model: "Submariner Date", reference: "126610LN", year: 2021, case_material: "Oystersteel", mm: 41, calibre: "3235", dial: "Black", bracelet: "Oyster, Glidelock clasp", box: true, papers: true, start: 3_000_000, reserve: 3_600_000, grade: "A", hours: 50 },
  { brand: "Omega", model: "Speedmaster Professional Moonwatch", reference: "310.30.42.50.01.001", year: 2022, case_material: "Stainless steel", mm: 42, calibre: "3861", dial: "Black", bracelet: "Steel bracelet", box: true, papers: true, start: 900_000, reserve: null, grade: "A", hours: 26 },
  { brand: "Cartier", model: "Santos de Cartier", reference: "WSSA0018", year: 2019, case_material: "Stainless steel", mm: 39.8, calibre: "1847 MC", dial: "Silvered", bracelet: "Steel QuickSwitch + leather", box: true, papers: false, start: 1_200_000, reserve: 1_500_000, grade: "B", hours: 74 },
  { brand: "Tudor", model: "Black Bay Fifty-Eight", reference: "79030N", year: 2020, case_material: "Stainless steel", mm: 39, calibre: "MT5402", dial: "Black", bracelet: "Riveted steel bracelet", box: true, papers: true, start: 600_000, reserve: null, grade: "A", hours: 0.05 },
  { brand: "Patek Philippe", model: "Calatrava", reference: "5196J", year: 2008, case_material: "18k yellow gold", mm: 37, calibre: "215 PS", dial: "Silvered", bracelet: "Leather strap", box: false, papers: true, start: 6_000_000, reserve: 7_500_000, grade: "B", hours: 170, upcoming: true },
];

async function main() {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  await c.query("begin");
  const admin = process.env.ADMIN_PHONES?.split(",")[0]?.trim() || "+923000000000";
  await c.query(
    `insert into users (phone, handle, full_name, role, kyc_status, cnic_last4) values ($1, 'house', 'Admin', 'admin', 'approved', '0000')
     on conflict (phone) do update set role = 'admin'`,
    [admin],
  );
  const bidders: string[] = [];
  for (const [i, handle] of ["gmt_master_lhr", "clifton_collector", "isb_horology"].entries()) {
    const r = await c.query(
      `insert into users (phone, handle, full_name, kyc_status, cnic_last4) values ($1, $2, $3, 'approved', '1234')
       on conflict (phone) do update set handle = excluded.handle returning id`,
      [`+92321000000${i}`, handle, `Sample Bidder ${i + 1}`],
    );
    bidders.push(r.rows[0].id);
    await c.query("insert into deposits (user_id, amount, method, reference, status, confirmed_at) values ($1, 500000, 'raast', $2, 'confirmed', now())", [r.rows[0].id, `SAMPLE-${i}`]);
    await c.query("select recalc_bid_limit($1)", [r.rows[0].id]);
  }
  const consignor = (await c.query("insert into consignors (name, phone, notes) values ('Sample Consignor', '+923339999999', 'Seed data') returning id")).rows[0].id;

  for (const w of WATCHES) {
    const watch = (await c.query(
      `insert into watches (consignor_id, brand, model, reference, year, case_material, case_diameter_mm, movement, calibre, dial, bracelet, has_box, has_papers, service_history, description, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'listed') returning id`,
      [consignor, w.brand, w.model, w.reference, w.year, w.case_material, w.mm, "automatic", w.calibre, w.dial, w.bracelet, w.box, w.papers,
       "Serviced 2024 by an independent watchmaker (sample)",
       `Sample listing. A ${w.year} ${w.brand} ${w.model} in ${w.grade === "A" ? "excellent" : "very good"} condition, consigned by a private collector in Lahore.\n\nPhotographed in our studio; the full authentication report is below.`],
    )).rows[0].id;
    await c.query(
      `insert into authentication_reports (watch_id, specialist, inspected_at, verdict, condition_grade, case_notes, dial_notes, bracelet_notes, movement_notes, rate_s_per_day, amplitude_deg, beat_error_ms, water_tested, aftermarket_parts, checks)
       values ($1, 'Lead Watch Specialist', current_date - 7, 'authentic', $2, 'Light desk-diving marks on clasp side; lugs unpolished', 'Original, no lume degradation', 'Minimal stretch', 'Clean; matches calibre', 2.5, 285, 0.2, true, null, $3)`,
      [watch, w.grade, JSON.stringify([
        { name: "Reference matches case, dial and calibre", result: "pass" },
        { name: "Case back opened; movement matches calibre", result: "pass" },
        { name: "Dial, hands, crystal, bezel original", result: "pass" },
        { name: "Papers match serial", result: w.papers ? "pass" : "na" },
        { name: "Not listed on stolen-watch registers checked", result: "pass" },
      ])],
    );
    const startsAt = w.upcoming ? "now() + interval '1 day'" : "now() - interval '5 days'";
    const lot = (await c.query(
      `insert into lots (watch_id, status, starting_price, reserve_price, starts_at, ends_at, scheduled_ends_at)
       values ($1, 'published', $2, $3, ${startsAt}, now() + ($4 || ' hours')::interval, now() + ($4 || ' hours')::interval) returning id`,
      [watch, w.start, w.reserve, w.hours],
    )).rows[0].id;
    if (!w.upcoming) {
      await c.query("select place_bid($1, $2, $3)", [lot, bidders[0], w.start + 50_000]);
      await c.query("select place_bid($1, $2, $3)", [lot, bidders[1], Math.round(w.start * 1.15 / 25_000) * 25_000]);
    }
  }
  await c.query("commit");
  await c.end();
  console.log("Seeded sample data. Sign in as", admin, "(the OTP is printed in the dev server log).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
