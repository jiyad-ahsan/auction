import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { query, queryOne } from "./db";
import { randomToken, sha256 } from "./crypto";
import { notifier } from "./notify";

export type User = {
  id: string;
  phone: string;
  full_name: string | null;
  handle: string | null;
  email: string | null;
  role: "bidder" | "staff" | "admin";
  kyc_status: "none" | "pending" | "approved" | "rejected";
  cnic_last4: string | null;
  kyc_notes: string | null;
  bid_limit: number;
  suspended: boolean;
};

const SESSION_COOKIE = "sid";
const SESSION_DAYS = 30;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5;

function otpHash(phone: string, code: string): string {
  return sha256(`${process.env.SESSION_SECRET ?? ""}:${phone}:${code}`);
}

export async function requestOtp(phone: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const recent = await queryOne<{ n: number }>(
    "select count(*)::int as n from otp_codes where phone = $1 and created_at > now() - interval '1 hour'",
    [phone],
  );
  if ((recent?.n ?? 0) >= OTP_MAX_PER_HOUR) {
    return { ok: false, error: "Too many codes requested. Try again in an hour." };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await query(
    `insert into otp_codes (phone, code_hash, expires_at) values ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [phone, otpHash(phone, code), OTP_TTL_MINUTES],
  );
  await notifier().send(phone, `Your verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`);
  return { ok: true };
}

export async function verifyOtp(phone: string, code: string): Promise<User | null> {
  const otp = await queryOne<{ id: number; code_hash: string; attempts: number }>(
    `select id, code_hash, attempts from otp_codes
      where phone = $1 and consumed_at is null and expires_at > now()
      order by created_at desc limit 1`,
    [phone],
  );
  if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) return null;
  if (otp.code_hash !== otpHash(phone, code.trim())) {
    await query("update otp_codes set attempts = attempts + 1 where id = $1", [otp.id]);
    return null;
  }
  await query("update otp_codes set consumed_at = now() where id = $1", [otp.id]);

  const adminPhones = (process.env.ADMIN_PHONES ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const role = adminPhones.includes(phone) ? "admin" : "bidder";
  const user = await queryOne<User>(
    `insert into users (phone, role) values ($1, $2)
     on conflict (phone) do update set role = case when excluded.role = 'admin' then 'admin' else users.role end
     returning *`,
    [phone, role],
  );
  return user;
}

export async function startSession(userId: string): Promise<void> {
  const token = randomToken();
  await query(
    `insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + ($3 || ' days')::interval)`,
    [sha256(token), userId, SESSION_DAYS],
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("delete from sessions where token_hash = $1", [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return queryOne<User>(
    `select u.* from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStaff(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "staff" && user.role !== "admin") redirect("/");
  return user;
}
