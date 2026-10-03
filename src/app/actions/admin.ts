"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DatabaseError } from "pg";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { closeDueLots } from "@/lib/closing";
import { query, queryOne, tx } from "@/lib/db";
import { notifier } from "@/lib/notify";
import { normalizePkPhone } from "@/lib/phone";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;
const optNum = (f: FormData, k: string) => {
  const v = str(f, k).replace(/,/g, "");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
// <input type="datetime-local"> values are entered in Pakistan time (UTC+5, no DST).
const pkt = (v: string) => new Date(`${v}:00+05:00`);

async function notifyUser(userId: string, message: string) {
  const u = await queryOne<{ phone: string }>("select phone from users where id = $1", [userId]);
  if (u) await notifier().send(u.phone, message).catch((e) => console.error("notify failed", e));
}

// ---------------------------------------------------------------- KYC & users

export async function reviewKycAction(formData: FormData) {
  const staff = await requireStaff();
  const userId = str(formData, "user_id");
  const decision = str(formData, "decision");
  const notes = optStr(formData, "notes");
  if (!["approved", "rejected"].includes(decision)) throw new Error("bad decision");
  await query(
    "update users set kyc_status = $1, kyc_notes = $2, kyc_reviewed_at = now(), kyc_reviewed_by = $3 where id = $4 and kyc_status = 'pending'",
    [decision, notes, staff.id, userId],
  );
  await audit(staff.id, `kyc.${decision}`, "user", userId, { notes });
  await notifyUser(userId, decision === "approved" ? "Your identity is verified. Add a deposit to start bidding." : `We couldn't verify your identity. ${notes ?? ""} Please check your account.`);
  revalidatePath("/admin/kyc");
}

export async function setSuspendedAction(formData: FormData) {
  const staff = await requireStaff();
  const userId = str(formData, "user_id");
  const suspended = str(formData, "suspended") === "true";
  await query("update users set suspended = $1 where id = $2", [suspended, userId]);
  await audit(staff.id, suspended ? "user.suspended" : "user.unsuspended", "user", userId);
  revalidatePath("/admin/kyc");
}

// ---------------------------------------------------------------- Deposits

export async function depositAction(formData: FormData) {
  const staff = await requireStaff();
  const id = str(formData, "deposit_id");
  const op = str(formData, "op");
  const transitions: Record<string, [string, string]> = {
    confirm: ["pending", "confirmed"],
    reject: ["pending", "rejected"],
    refund: ["confirmed", "refunded"],
    forfeit: ["confirmed", "forfeited"],
  };
  const t = transitions[op];
  if (!t) throw new Error("bad op");

  const error = await tx(async (c) => {
    const dep = (await c.query("select * from deposits where id = $1 for update", [id])).rows[0];
    if (!dep || dep.status !== t[0]) return "Deposit is not in the expected state.";
    // Lock the user so concurrent bids see a consistent limit.
    await c.query("select 1 from users where id = $1 for update", [dep.user_id]);
    if (op === "confirm") {
      await c.query("update deposits set status = 'confirmed', confirmed_at = now(), confirmed_by = $2 where id = $1", [id, staff.id]);
    } else if (op === "reject") {
      await c.query("update deposits set status = 'rejected', closed_at = now(), closed_by = $2 where id = $1", [id, staff.id]);
    } else {
      await c.query("update deposits set status = $3, closed_at = now(), closed_by = $2 where id = $1", [id, staff.id, t[1]]);
    }
    const limit = Number((await c.query("select recalc_bid_limit($1) as l", [dep.user_id])).rows[0].l);
    if (op === "refund") {
      const exposure = Number((await c.query("select bidder_exposure($1, null) as e", [dep.user_id])).rows[0].e);
      if (exposure > limit) throw new RefundBlocked();
    }
    await c.query(
      "insert into audit_log (actor_id, action, entity, entity_id, data) values ($1, $2, 'deposit', $3, $4)",
      [staff.id, `deposit.${t[1]}`, id, JSON.stringify({ amount: dep.amount, new_limit: limit })],
    );
    return null;
  }).catch((e) => {
    if (e instanceof RefundBlocked) return "Can't refund: the bidder is leading lots or has unpaid purchases that need this deposit.";
    throw e;
  });
  if (error) redirect(`/admin/deposits?error=${encodeURIComponent(error)}`);
  revalidatePath("/admin/deposits");
}
class RefundBlocked extends Error {}

// ---------------------------------------------------------------- Consignments

export async function consignmentRequestStatusAction(formData: FormData) {
  const staff = await requireStaff();
  const id = str(formData, "id");
  const status = str(formData, "status");
  await query("update consignment_requests set status = $1 where id = $2", [status, id]);
  await audit(staff.id, "consignment_request.status", "consignment_request", id, { status });
  revalidatePath("/admin/consignments");
}

export async function createWatchAction(formData: FormData) {
  const staff = await requireStaff();
  let consignorId = optStr(formData, "consignor_id");
  if (!consignorId) {
    const name = str(formData, "consignor_name");
    const phone = normalizePkPhone(str(formData, "consignor_phone"));
    if (!name || !phone) redirect("/admin/watches?error=consignor");
    const linked = await queryOne<{ id: string }>("select id from users where phone = $1", [phone]);
    const [c] = await query<{ id: string }>(
      "insert into consignors (name, phone, user_id, cnic_last4, notes) values ($1, $2, $3, $4, $5) returning id",
      [name, phone, linked?.id ?? null, optStr(formData, "consignor_cnic_last4"), optStr(formData, "consignor_notes")],
    );
    consignorId = c.id;
  }
  const brand = str(formData, "brand");
  const model = str(formData, "model");
  const reference = str(formData, "reference");
  if (!brand || !model || !reference) redirect("/admin/watches?error=watch");
  const movement = optStr(formData, "movement");
  const [w] = await query<{ id: string }>(
    `insert into watches (consignor_id, brand, model, reference, serial_private, year, case_material, case_diameter_mm,
                          movement, calibre, dial, bracelet, has_box, has_papers, papers_date, service_history, description, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'authenticating') returning id`,
    [
      consignorId, brand, model, reference, optStr(formData, "serial_private"), optNum(formData, "year"),
      optStr(formData, "case_material"), optNum(formData, "case_diameter_mm"),
      movement && ["automatic", "manual", "quartz"].includes(movement) ? movement : null,
      optStr(formData, "calibre"), optStr(formData, "dial"), optStr(formData, "bracelet"),
      formData.get("has_box") === "on", formData.get("has_papers") === "on", optStr(formData, "papers_date"),
      optStr(formData, "service_history"), optStr(formData, "description"),
    ],
  );
  await audit(staff.id, "watch.created", "watch", w.id);
  redirect(`/admin/watches/${w.id}`);
}

export async function updateWatchDescriptionAction(formData: FormData) {
  const staff = await requireStaff();
  const id = str(formData, "watch_id");
  await query("update watches set description = $1, service_history = $2 where id = $3", [optStr(formData, "description"), optStr(formData, "service_history"), id]);
  await audit(staff.id, "watch.updated", "watch", id);
  revalidatePath(`/admin/watches/${id}`);
}

export async function addMediaAction(formData: FormData) {
  const staff = await requireStaff();
  const watchId = str(formData, "watch_id");
  const url = str(formData, "url");
  if (!/^https:\/\//.test(url)) redirect(`/admin/watches/${watchId}?error=media`);
  await query(
    "insert into media (watch_id, url, alt, position) values ($1, $2, $3, coalesce((select max(position) + 1 from media where watch_id = $1), 0))",
    [watchId, url, optStr(formData, "alt")],
  );
  await audit(staff.id, "media.added", "watch", watchId, { url });
  revalidatePath(`/admin/watches/${watchId}`);
}

export async function removeMediaAction(formData: FormData) {
  const staff = await requireStaff();
  const watchId = str(formData, "watch_id");
  await query("delete from media where id = $1 and watch_id = $2", [str(formData, "media_id"), watchId]);
  await audit(staff.id, "media.removed", "watch", watchId);
  revalidatePath(`/admin/watches/${watchId}`);
}

// Checks are entered one per line as "Check name | pass|fail|na | optional note".
function parseChecks(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, result = "pass", ...note] = line.split("|").map((p) => p.trim());
      return { name, result: ["pass", "fail", "na"].includes(result) ? result : "pass", note: note.join(" | ") || undefined };
    });
}

export async function saveReportAction(formData: FormData) {
  const staff = await requireStaff();
  const watchId = str(formData, "watch_id");
  const verdict = str(formData, "verdict");
  const grade = str(formData, "condition_grade");
  const waterTested = str(formData, "water_tested");
  await query(
    `insert into authentication_reports (watch_id, specialist, inspected_at, verdict, condition_grade, case_notes, dial_notes,
        bracelet_notes, movement_notes, rate_s_per_day, amplitude_deg, beat_error_ms, water_tested, aftermarket_parts, checks)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     on conflict (watch_id) do update set
        specialist = excluded.specialist, inspected_at = excluded.inspected_at, verdict = excluded.verdict,
        condition_grade = excluded.condition_grade, case_notes = excluded.case_notes, dial_notes = excluded.dial_notes,
        bracelet_notes = excluded.bracelet_notes, movement_notes = excluded.movement_notes,
        rate_s_per_day = excluded.rate_s_per_day, amplitude_deg = excluded.amplitude_deg, beat_error_ms = excluded.beat_error_ms,
        water_tested = excluded.water_tested, aftermarket_parts = excluded.aftermarket_parts, checks = excluded.checks`,
    [
      watchId, str(formData, "specialist"), str(formData, "inspected_at"), verdict, grade,
      optStr(formData, "case_notes"), optStr(formData, "dial_notes"), optStr(formData, "bracelet_notes"), optStr(formData, "movement_notes"),
      optNum(formData, "rate_s_per_day"), optNum(formData, "amplitude_deg"), optNum(formData, "beat_error_ms"),
      waterTested === "" ? null : waterTested === "yes", optStr(formData, "aftermarket_parts"),
      JSON.stringify(parseChecks(str(formData, "checks"))),
    ],
  );
  const status = verdict === "authentic" ? "approved" : "rejected";
  await query("update watches set status = $1 where id = $2 and status in ('intake', 'authenticating', 'approved', 'rejected')", [status, watchId]);
  await audit(staff.id, "report.saved", "watch", watchId, { verdict, grade });
  revalidatePath(`/admin/watches/${watchId}`);
}

// ---------------------------------------------------------------- Lots

export async function createLotAction(formData: FormData) {
  const staff = await requireStaff();
  const watchId = str(formData, "watch_id");
  const report = await queryOne<{ verdict: string }>("select verdict from authentication_reports where watch_id = $1", [watchId]);
  if (report?.verdict !== "authentic") redirect(`/admin/watches/${watchId}?error=not_authenticated`);

  const starting = optNum(formData, "starting_price");
  const reserve = optNum(formData, "reserve_price");
  const startsAt = pkt(str(formData, "starts_at"));
  const endsAt = pkt(str(formData, "ends_at"));
  if (!starting || starting <= 0 || (reserve !== null && reserve < starting) || isNaN(+startsAt) || isNaN(+endsAt) || endsAt <= startsAt) {
    redirect(`/admin/watches/${watchId}?error=lot`);
  }
  const publish = formData.get("publish") === "on";
  const extensionMinutes = Math.min(30, Math.max(1, Number(str(formData, "extension_minutes")) || 5));
  let lot: { id: string };
  try {
    [lot] = await query<{ id: string }>(
      `insert into lots (watch_id, status, starting_price, reserve_price, starts_at, ends_at, scheduled_ends_at, extension_seconds)
       values ($1, $2, $3, $4, $5, $6, $6, $7) returning id`,
      [watchId, publish ? "published" : "draft", starting, reserve, startsAt, endsAt, extensionMinutes * 60],
    );
  } catch (e) {
    const code = publishError(e);
    if (code) redirect(`/admin/watches/${watchId}?error=${code}`);
    throw e;
  }
  await query("update watches set status = 'listed' where id = $1", [watchId]);
  await audit(staff.id, "lot.created", "lot", lot.id, { starting, reserve, publish, extensionMinutes });
  redirect("/admin/lots");
}

export async function publishLotAction(formData: FormData) {
  const staff = await requireStaff();
  const id = str(formData, "lot_id");
  try {
    await query("update lots set status = 'published' where id = $1 and status = 'draft' and ends_at > now()", [id]);
  } catch (e) {
    const code = publishError(e);
    if (code) redirect(`/admin/lots?error=${code}`);
    throw e;
  }
  await audit(staff.id, "lot.published", "lot", id);
  revalidatePath("/admin/lots");
}

// The database refuses to publish a lot unless the watch is in our custody and
// the consignor has signed the no-shill agreement.
function publishError(e: unknown): string | null {
  if (e instanceof DatabaseError && (e.message === "WATCH_NOT_IN_CUSTODY" || e.message === "NO_SHILL_AGREEMENT_MISSING")) {
    return e.message === "WATCH_NOT_IN_CUSTODY" ? "not_in_custody" : "no_shill";
  }
  return null;
}

// A deal agreed after a lot missed its reserve still runs through Nilaam.
export async function postAuctionSaleAction(formData: FormData) {
  const staff = await requireStaff();
  const lotId = str(formData, "lot_id");
  const buyerId = str(formData, "buyer_id");
  const price = optNum(formData, "price");
  if (!buyerId || !price || price <= 0) redirect("/admin/lots?error=post_sale");
  try {
    await query("select record_post_auction_sale($1, $2, $3, $4)", [lotId, buyerId, price, staff.id]);
  } catch (e) {
    if (e instanceof DatabaseError && ["LOT_NOT_UNSOLD", "BUYER_DID_NOT_BID", "INVALID_AMOUNT"].includes(e.message)) {
      redirect(`/admin/lots?error=post_sale`);
    }
    throw e;
  }
  await notifyUser(buyerId, `Your offer of PKR ${price.toLocaleString("en-US")} has been accepted. Payment details are in your account.`);
  redirect("/admin/invoices");
}

// Outage policy: extend a live lot. Never shortens.
export async function extendLotAction(formData: FormData) {
  const staff = await requireStaff();
  const id = str(formData, "lot_id");
  const minutes = Math.min(24 * 60, Math.max(1, Number(str(formData, "minutes")) || 0));
  await query("update lots set ends_at = ends_at + ($2 || ' minutes')::interval where id = $1 and status = 'published'", [id, minutes]);
  await audit(staff.id, "lot.extended", "lot", id, { minutes });
  revalidatePath("/admin/lots");
}

export async function closeDueLotsAction() {
  const staff = await requireStaff();
  const n = await closeDueLots();
  await audit(staff.id, "lots.close_run", "lot", null, { closed: n });
  revalidatePath("/admin/lots");
}

// ---------------------------------------------------------------- Invoices & settlements

export async function invoiceAction(formData: FormData) {
  const staff = await requireStaff();
  const id = str(formData, "invoice_id");
  const op = str(formData, "op");
  if (op === "paid") {
    const method = str(formData, "method");
    const reference = str(formData, "reference");
    if (!reference) redirect("/admin/invoices?error=reference");
    await query(
      "update invoices set status = 'paid', paid_at = now(), payment_method = $2, payment_reference = $3, confirmed_by = $4 where id = $1 and status = 'unpaid'",
      [id, method, reference, staff.id],
    );
    const inv = await queryOne<{ buyer_id: string }>("select buyer_id from invoices where id = $1", [id]);
    if (inv) await notifyUser(inv.buyer_id, "Payment received, thank you. We'll contact you to arrange collection from our viewing room.");
  } else if (op === "handed_over") {
    // Collection needs a verified CNIC, and releases the watch from our custody.
    const inv = await queryOne<{ kyc_status: string; watch_id: string }>(
      `select u.kyc_status, l.watch_id from invoices i join users u on u.id = i.buyer_id join lots l on l.id = i.lot_id
        where i.id = $1 and i.status = 'paid' and i.handed_over_at is null`,
      [id],
    );
    if (!inv) redirect("/admin/invoices");
    if (inv.kyc_status !== "approved") redirect("/admin/invoices?error=cnic");
    await tx(async (c) => {
      await c.query("update invoices set handed_over_at = now() where id = $1", [id]);
      await c.query("update watches set custody_status = 'released_to_buyer', custody_released_at = now() where id = $1", [inv.watch_id]);
      await c.query("insert into custody_events (watch_id, event, actor_id, note) values ($1, 'released_to_buyer', $2, 'Collected by buyer')", [inv.watch_id, staff.id]);
    });
  } else if (op === "defaulted") {
    await tx(async (c) => {
      const inv = (await c.query("update invoices set status = 'defaulted' where id = $1 and status = 'unpaid' returning lot_id, buyer_id", [id])).rows[0];
      if (!inv) return;
      await c.query("update settlements set status = 'void' where lot_id = $1", [inv.lot_id]);
      await c.query("update users set suspended = true where id = $1", [inv.buyer_id]);
      // The watch stays in our custody and can be relisted.
      await c.query("update watches set status = 'approved' from lots where lots.id = $1 and watches.id = lots.watch_id", [inv.lot_id]);
    });
  } else {
    throw new Error("bad op");
  }
  await audit(staff.id, `invoice.${op}`, "invoice", id);
  revalidatePath("/admin/invoices");
}

export async function settlementPaidAction(formData: FormData) {
  const staff = await requireStaff();
  const id = str(formData, "settlement_id");
  const reference = str(formData, "reference");
  if (!reference) redirect("/admin/invoices?error=reference");
  // Only pay consignors once the buyer has paid and collected.
  const updated = await query(
    `update settlements s set status = 'paid', paid_at = now(), reference = $2
       from invoices i
      where s.id = $1 and s.status = 'pending' and i.lot_id = s.lot_id and i.status = 'paid' and i.handed_over_at is not null
      returning s.id`,
    [id, reference],
  );
  if (updated.length === 0) redirect("/admin/invoices?error=settlement");
  await audit(staff.id, "settlement.paid", "settlement", id, { reference });
  revalidatePath("/admin/invoices");
}

// ---------------------------------------------------------------- Custody

export async function custodyAction(formData: FormData) {
  const staff = await requireStaff();
  const watchId = str(formData, "watch_id");
  const op = str(formData, "op");
  const location = optStr(formData, "location");
  const note = optStr(formData, "note");
  const back = `/admin/watches/${watchId}`;
  const w = await queryOne<{ custody_status: string; status: string }>("select custody_status, status from watches where id = $1", [watchId]);
  if (!w) redirect("/admin/watches");

  if (op === "received") {
    if (!location) redirect(`${back}?error=location`);
    if (w.custody_status !== "with_consignor") redirect(back);
    await tx(async (c) => {
      await c.query("update watches set custody_status = 'in_custody', custody_location = $2, custody_received_at = now() where id = $1", [watchId, location]);
      await c.query("insert into custody_events (watch_id, event, location, note, actor_id) values ($1, 'received', $2, $3, $4)", [watchId, location, note, staff.id]);
    });
  } else if (op === "moved") {
    if (!location || w.custody_status !== "in_custody") redirect(`${back}?error=location`);
    await tx(async (c) => {
      await c.query("update watches set custody_location = $2 where id = $1", [watchId, location]);
      await c.query("insert into custody_events (watch_id, event, location, note, actor_id) values ($1, 'moved', $2, $3, $4)", [watchId, location, note, staff.id]);
    });
  } else if (op === "returned") {
    const open = await queryOne("select 1 from lots where watch_id = $1 and status <> 'closed'", [watchId]);
    if (open || w.status === "sold" || w.custody_status !== "in_custody") redirect(`${back}?error=return`);
    await tx(async (c) => {
      await c.query("update watches set custody_status = 'returned_to_consignor', custody_released_at = now(), status = 'returned' where id = $1", [watchId]);
      await c.query("insert into custody_events (watch_id, event, note, actor_id) values ($1, 'returned_to_consignor', $2, $3)", [watchId, note, staff.id]);
    });
  } else {
    throw new Error("bad op");
  }
  await audit(staff.id, `custody.${op}`, "watch", watchId, { location, note });
  revalidatePath(back);
}

export async function noShillAgreementAction(formData: FormData) {
  const staff = await requireStaff();
  const consignorId = str(formData, "consignor_id");
  const watchId = str(formData, "watch_id");
  await query("update consignors set no_shill_agreed_at = now() where id = $1 and no_shill_agreed_at is null", [consignorId]);
  await audit(staff.id, "consignor.no_shill_agreed", "consignor", consignorId);
  revalidatePath(`/admin/watches/${watchId}`);
}

// ---------------------------------------------------------------- Tags

export async function setWatchTagsAction(formData: FormData) {
  const staff = await requireStaff();
  const watchId = str(formData, "watch_id");
  const tagIds = formData.getAll("tag_id").map(String);
  await tx(async (c) => {
    await c.query("delete from watch_tags where watch_id = $1", [watchId]);
    if (tagIds.length) {
      await c.query("insert into watch_tags (watch_id, tag_id) select $1, unnest($2::uuid[]) on conflict do nothing", [watchId, tagIds]);
    }
  });
  await audit(staff.id, "watch.tags", "watch", watchId, { tagIds });
  revalidatePath(`/admin/watches/${watchId}`);
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export async function createTagAction(formData: FormData) {
  const staff = await requireStaff();
  const label = str(formData, "label");
  const slug = slugify(str(formData, "slug") || label);
  if (label.length < 2 || slug.length < 2) redirect("/admin/tags?error=tag");
  const exists = await queryOne("select 1 from tags where slug = $1", [slug]);
  if (exists) redirect("/admin/tags?error=tag_exists");
  await query("insert into tags (slug, label, description) values ($1, $2, $3)", [slug, label, optStr(formData, "description")]);
  await audit(staff.id, "tag.created", "tag", slug, { label });
  revalidatePath("/admin/tags");
}

export async function updateTagAction(formData: FormData) {
  const staff = await requireStaff();
  const id = str(formData, "tag_id");
  const label = str(formData, "label");
  if (label.length < 2) redirect("/admin/tags?error=tag");
  await query("update tags set label = $2, description = $3, active = $4 where id = $1", [id, label, optStr(formData, "description"), formData.get("active") === "on"]);
  await audit(staff.id, "tag.updated", "tag", id, { label });
  revalidatePath("/admin/tags");
}

// ---------------------------------------------------------------- Invites, limits and settings

export async function createInviteAction(formData: FormData) {
  const staff = await requireStaff();
  const label = str(formData, "label");
  const code = (str(formData, "code") || label).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
  const limit = optNum(formData, "default_bid_limit") ?? 0;
  const maxUses = optNum(formData, "max_uses");
  if (label.length < 2 || code.length < 4 || limit < 0) redirect("/admin/invites?error=invite");
  const exists = await queryOne("select 1 from invites where code = $1", [code]);
  if (exists) redirect("/admin/invites?error=invite_exists");
  await query(
    "insert into invites (code, label, default_bid_limit, max_uses, created_by) values ($1, $2, $3, $4, $5)",
    [code, label, limit, maxUses && maxUses > 0 ? maxUses : null, staff.id],
  );
  await audit(staff.id, "invite.created", "invite", code, { label, limit, maxUses });
  revalidatePath("/admin/invites");
}

export async function toggleInviteAction(formData: FormData) {
  const staff = await requireStaff();
  const id = str(formData, "invite_id");
  await query("update invites set active = not active where id = $1", [id]);
  await audit(staff.id, "invite.toggled", "invite", id);
  revalidatePath("/admin/invites");
}

export async function setAssignedLimitAction(formData: FormData) {
  const staff = await requireStaff();
  const userId = str(formData, "user_id");
  const amount = optNum(formData, "assigned_limit");
  if (amount === null || amount < 0) redirect("/admin/kyc?error=limit");
  await tx(async (c) => {
    await c.query("select 1 from users where id = $1 for update", [userId]);
    await c.query("update users set assigned_limit = $2 where id = $1", [userId, amount]);
    await c.query("select recalc_bid_limit($1)", [userId]);
  });
  await audit(staff.id, "user.assigned_limit", "user", userId, { amount });
  revalidatePath("/admin/kyc");
}

export async function updateSettingsAction(formData: FormData) {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");
  const baseline = optNum(formData, "baseline_sell_through_pct");
  const pilot = formData.get("pilot_mode") === "on";
  const inviteOnly = formData.get("invite_only") === "on";
  await query(
    "update app_settings set pilot_mode = $1, invite_only = $2, baseline_sell_through_pct = $3, updated_at = now()",
    [pilot, inviteOnly, baseline !== null && baseline >= 0 && baseline <= 100 ? baseline : null],
  );
  await audit(staff.id, "settings.updated", "settings", null, { pilot, inviteOnly, baseline });
  revalidatePath("/admin");
  redirect("/admin/settings?saved=1");
}
