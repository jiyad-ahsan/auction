"use server";

import { redirect } from "next/navigation";
import { checkInvite, endSession, requestOtp, startSession, verifyOtp } from "@/lib/auth";
import { normalizePkPhone } from "@/lib/phone";

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/account";
}

function loginUrl(params: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  return `/login?${q.toString()}`;
}

export async function requestOtpAction(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const invite = String(formData.get("invite") ?? "").trim().toUpperCase() || null;
  const phone = normalizePkPhone(String(formData.get("phone") ?? ""));
  if (!phone) redirect(loginUrl({ error: "phone", next, invite }));
  const check = await checkInvite(phone, invite);
  if (!check.ok) redirect(loginUrl({ error: check.error, next, invite }));
  const res = await requestOtp(phone);
  if (!res.ok) redirect(loginUrl({ error: "rate", next, invite }));
  redirect(loginUrl({ phone, next, invite }));
}

export async function verifyOtpAction(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const invite = String(formData.get("invite") ?? "").trim().toUpperCase() || null;
  const phone = normalizePkPhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "");
  if (!phone) redirect(loginUrl({ error: "phone" }));
  const user = await verifyOtp(phone, code, invite);
  if (user === "invite_invalid") redirect(loginUrl({ error: "invite_invalid", next, invite }));
  if (!user) redirect(loginUrl({ phone, error: "code", next, invite }));
  await startSession(user.id);
  redirect(next);
}

export async function signOutAction() {
  await endSession();
  redirect("/");
}
