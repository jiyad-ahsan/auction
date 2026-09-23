"use server";

import { redirect } from "next/navigation";
import { endSession, requestOtp, startSession, verifyOtp } from "@/lib/auth";
import { normalizePkPhone } from "@/lib/phone";

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/account";
}

export async function requestOtpAction(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const phone = normalizePkPhone(String(formData.get("phone") ?? ""));
  if (!phone) redirect(`/login?error=phone&next=${encodeURIComponent(next)}`);
  const res = await requestOtp(phone);
  if (!res.ok) redirect(`/login?error=rate&next=${encodeURIComponent(next)}`);
  redirect(`/login?phone=${encodeURIComponent(phone)}&next=${encodeURIComponent(next)}`);
}

export async function verifyOtpAction(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const phone = normalizePkPhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "");
  if (!phone) redirect("/login?error=phone");
  const user = await verifyOtp(phone, code);
  if (!user) redirect(`/login?phone=${encodeURIComponent(phone)}&error=code&next=${encodeURIComponent(next)}`);
  await startSession(user.id);
  redirect(next);
}

export async function signOutAction() {
  await endSession();
  redirect("/");
}
