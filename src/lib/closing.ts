import { query } from "./db";
import { formatPKR } from "./money";
import { notifier } from "./notify";

// Finalise due lots, then tell winners what they owe.
export async function closeDueLots(): Promise<number> {
  const [{ n }] = await query<{ n: number }>("select close_due_lots() as n");
  {
    // Claim un-notified invoices atomically so overlapping runs don't double-send.
    const winners = await query<{ id: string; phone: string; lot_number: number; total: number; due_at: Date }>(
      `with claimed as (
         update invoices set winner_notified_at = now()
          where winner_notified_at is null and status = 'unpaid'
          returning id, buyer_id, lot_id, total, due_at)
       select c.id, u.phone, l.lot_number, c.total, c.due_at
         from claimed c join users u on u.id = c.buyer_id join lots l on l.id = c.lot_id`,
    );
    for (const w of winners) {
      await notifier()
        .send(
          w.phone,
          `Congratulations, you won Lot ${w.lot_number}. Amount due ${formatPKR(w.total)} by ${new Date(w.due_at).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" })}. Payment details: ${process.env.APP_URL ?? ""}/account`,
        )
        .catch((e) => console.error("win notification failed", e));
    }
  }
  return n;
}
