"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { query, queryOne } from "@/lib/db";
import { sendEmailCode, validEmail, verifyEmailCode } from "@/lib/email";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) redirect("/account?error=handle");
  const taken = await queryOne("select 1 from users where handle = $1 and id <> $2", [handle, user.id]);
  if (taken) redirect("/account?error=handle_taken");
  await query("update users set handle = $1 where id = $2", [handle, user.id]);
  revalidatePath("/account");
  redirect("/account?saved=profile");
}

export async function submitKycAction(formData: FormData) {
  const user = await requireUser();
  if (user.kyc_status === "approved" || user.kyc_status === "pending") redirect("/account");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const cnic = String(formData.get("cnic") ?? "").replace(/\D/g, "");
  if (fullName.length < 3 || cnic.length !== 13) redirect("/account?error=kyc");
  await query(
    `update users set full_name = $1, cnic_encrypted = $2, cnic_last4 = $3,
            kyc_status = 'pending', kyc_submitted_at = now(), kyc_notes = null
      where id = $4`,
    [fullName, encrypt(cnic), cnic.slice(-4), user.id],
  );
  await audit(user.id, "kyc.submitted", "user", user.id);
  redirect("/account?saved=kyc");
}

export async function submitDepositAction(formData: FormData) {
  const user = await requireUser();
  const amount = Number(String(formData.get("amount") ?? "").replace(/\D/g, ""));
  const method = String(formData.get("method") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!Number.isSafeInteger(amount) || amount < 50_000 || !["raast", "ibft", "pay_order"].includes(method) || reference.length < 4) {
    redirect("/account?error=deposit");
  }
  const [d] = await query<{ id: string }>(
    "insert into deposits (user_id, amount, method, reference) values ($1, $2, $3, $4) returning id",
    [user.id, amount, method, reference],
  );
  await audit(user.id, "deposit.submitted", "deposit", d.id, { amount, method });
  redirect("/account?saved=deposit");
}

export async function sendEmailCodeAction(formData: FormData) {
  const user = await requireUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!validEmail(email)) redirect("/account?error=email");
  const res = await sendEmailCode(user.id, email);
  if (res === "rate") redirect(`/account?error=email_rate&email_pending=${encodeURIComponent(email)}`);
  redirect(`/account?saved=email_sent&email_pending=${encodeURIComponent(email)}`);
}

export async function verifyEmailCodeAction(formData: FormData) {
  const user = await requireUser();
  const ok = await verifyEmailCode(user.id, String(formData.get("code") ?? ""));
  if (!ok) redirect("/account?error=email_code");
  await audit(user.id, "email.verified", "user", user.id);
  redirect("/account?saved=email_verified");
}
