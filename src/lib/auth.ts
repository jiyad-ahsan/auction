import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { query, queryOne, tx } from "./db";
import { settings } from "./settings";
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
  assigned_limit: number;
  email_verified_at: Date | null;
  invite_id: string | null;
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

function isAdminPhone(phone: string): boolean {
  return (process.env.ADMIN_PHONES ?? "").split(",").map((p) => p.trim()).filter(Boolean).includes(phone);
}

export type InviteCheck = { ok: true; inviteId: string | null } | { ok: false; error: "invite_required" | "invite_invalid" };

// New members need a valid invite while the platform is invite-only. Existing
// members and admins sign in without one.
export async function checkInvite(phone: string, code: string | null): Promise<InviteCheck> {
  const existing = await queryOne("select 1 from users where phone = $1", [phone]);
  if (existing || isAdminPhone(phone)) return { ok: true, inviteId: null };
  const { invite_only } = await settings();
  if (!code) return invite_only ? { ok: false, error: "invite_required" } : { ok: true, inviteId: null };
  const invite = await queryOne<{ id: string }>(
    "select id from invites where code = $1 and active and (max_uses is null or uses < max_uses)",
    [code.trim().toUpperCase()],
  );
  if (!invite) return invite_only ? { ok: false, error: "invite_invalid" } : { ok: true, inviteId: null };
  return { ok: true, inviteId: invite.id };
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

export async function verifyOtp(phone: string, code: string, inviteCode: string | null = null): Promise<User | null | "invite_invalid"> {
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

  const role = isAdminPhone(phone) ? "admin" : "bidder";
  const existing = await queryOne<User>("select * from users where phone = $1", [phone]);
  if (existing) {
    if (role === "admin" && existing.role !== "admin") {
      return queryOne<User>("update users set role = 'admin' where id = $1 returning *", [existing.id]);
    }
    return existing;
  }

  // New member: claim an invite use atomically, and start with that invite's bid limit.
  return tx(async (c) => {
    let inviteId: string | null = null;
    let assigned = 0;
    if (inviteCode) {
      const inv = (
        await c.query(
          `update invites set uses = uses + 1
            where code = $1 and active and (max_uses is null or uses < max_uses)
            returning id, default_bid_limit`,
          [inviteCode.trim().toUpperCase()],
        )
      ).rows[0];
      if (inv) {
        inviteId = inv.id;
        assigned = Number(inv.default_bid_limit);
      }
    }
    const { invite_only } = (await c.query("select invite_only from app_settings")).rows[0] ?? { invite_only: true };
    if (!inviteId && invite_only && role !== "admin") return "invite_invalid" as const;
    const user = (
      await c.query(
        "insert into users (phone, role, invite_id, assigned_limit, bid_limit) values ($1, $2, $3, $4, $4) returning *",
        [phone, role, inviteId, assigned],
      )
    ).rows[0] as User;
    return user;
  });
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
