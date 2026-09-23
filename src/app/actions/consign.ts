"use server";

import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { normalizePkPhone } from "@/lib/phone";

export async function consignRequestAction(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const phone = normalizePkPhone(get("phone"));
  const name = get("name");
  const brand = get("brand");
  if (!phone || name.length < 2 || brand.length < 2) redirect("/consign?error=1");

  // Light abuse guard: at most 5 enquiries per phone per day.
  const recent = await queryOne<{ n: number }>(
    "select count(*)::int as n from consignment_requests where phone = $1 and created_at > now() - interval '1 day'",
    [phone],
  );
  if ((recent?.n ?? 0) >= 5) redirect("/consign?error=1");

  const year = Number(get("year")) || null;
  const expected = Number(get("expected_price").replace(/\D/g, "")) || null;
  await query(
    `insert into consignment_requests (name, phone, city, brand, model, reference, year, box_papers, expected_price, notes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [name, phone, get("city") || null, brand, get("model") || null, get("reference") || null, year, get("box_papers") || null, expected, get("notes") || null],
  );
  redirect("/consign?sent=1");
}
