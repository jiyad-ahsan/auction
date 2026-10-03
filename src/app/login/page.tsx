import { requestOtpAction, verifyOtpAction } from "@/app/actions/auth";
import { maskPhone } from "@/lib/phone";
import { settings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  phone: "Enter a Pakistani mobile number, e.g. 0300 1234567.",
  rate: "Too many codes requested. Please try again in an hour.",
  code: "That code is incorrect or has expired.",
  invite_required: "Nilaam is invite-only for now. Enter the invite code from your group, or use the invite link you were sent.",
  invite_invalid: "That invite code isn't valid or has been used up. Check with whoever invited you.",
};

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { phone, error, next = "/account", invite = "" } = await searchParams;
  const { invite_only } = await settings();
  return (
    <div className="narrow">
      <h1>Sign in</h1>
      {error && <div className="notice bad">{ERRORS[error] ?? "Something went wrong."}</div>}
      {!phone ? (
        <form action={requestOtpAction} className="stack">
          <input type="hidden" name="next" value={next} />
          <label>
            Mobile number
            <input name="phone" type="tel" inputMode="tel" placeholder="0300 1234567" required autoComplete="tel" />
          </label>
          <label>
            Invite code {invite_only ? <span className="muted">(new members)</span> : <span className="muted">(optional)</span>}
            <input name="invite" defaultValue={invite} placeholder="e.g. LHR-VINTAGE" autoCapitalize="characters" />
          </label>
          <button type="submit">Send code</button>
          <p className="muted small">We&apos;ll send a 6-digit code by WhatsApp or SMS. Already a member? Leave the invite code empty.</p>
        </form>
      ) : (
        <form action={verifyOtpAction} className="stack">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="phone" value={phone} />
          <input type="hidden" name="invite" value={invite} />
          <p>Enter the code sent to {maskPhone(phone)}.</p>
          <label>
            Code
            <input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" />
          </label>
          <button type="submit">Verify</button>
          <a className="small" href={`/login?next=${encodeURIComponent(next)}${invite ? `&invite=${encodeURIComponent(invite)}` : ""}`}>Use a different number</a>
        </form>
      )}
    </div>
  );
}
