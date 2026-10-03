import { randomInt } from "node:crypto";
import { query, queryOne } from "./db";
import { sha256 } from "./crypto";
import { notifier } from "./notify";

const TTL_MINUTES = 30;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

const hash = (userId: string, code: string) => sha256(`${process.env.SESSION_SECRET ?? ""}:email:${userId}:${code}`);

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 200;
}

export async function sendEmailCode(userId: string, email: string): Promise<"ok" | "rate"> {
  const recent = await queryOne<{ n: number }>(
    "select count(*)::int as n from email_codes where user_id = $1 and created_at > now() - interval '1 hour'",
    [userId],
  );
  if ((recent?.n ?? 0) >= MAX_PER_HOUR) return "rate";
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await query(
    `insert into email_codes (user_id, email, code_hash, expires_at) values ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [userId, email, hash(userId, code), TTL_MINUTES],
  );
  await notifier().email(email, "Your Nilaam verification code", `Your code is ${code}. It expires in ${TTL_MINUTES} minutes.`);
  return "ok";
}

// Marks the email verified when the code matches the most recent unexpired code
// sent to that same address.
export async function verifyEmailCode(userId: string, code: string): Promise<boolean> {
  const row = await queryOne<{ id: number; email: string; code_hash: string; attempts: number }>(
    `select id, email, code_hash, attempts from email_codes
      where user_id = $1 and consumed_at is null and expires_at > now()
      order by created_at desc limit 1`,
    [userId],
  );
  if (!row || row.attempts >= MAX_ATTEMPTS) return false;
  if (row.code_hash !== hash(userId, code.trim())) {
    await query("update email_codes set attempts = attempts + 1 where id = $1", [row.id]);
    return false;
  }
  await query("update email_codes set consumed_at = now() where id = $1", [row.id]);
  await query("update users set email = $1, email_verified_at = now() where id = $2", [row.email, userId]);
  return true;
}
