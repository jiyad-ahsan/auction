import { requestOtpAction, verifyOtpAction } from "@/app/actions/auth";
import { maskPhone } from "@/lib/phone";

const ERRORS: Record<string, string> = {
  phone: "Enter a Pakistani mobile number, e.g. 0300 1234567.",
  rate: "Too many codes requested. Please try again in an hour.",
  code: "That code is incorrect or has expired.",
};

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { phone, error, next = "/account" } = await searchParams;
  return (
    <>
      <h1>Sign in</h1>
      {error && <div className="notice bad">{ERRORS[error] ?? "Something went wrong."}</div>}
      {!phone ? (
        <form action={requestOtpAction} className="stack">
          <input type="hidden" name="next" value={next} />
          <label>
            Mobile number
            <input name="phone" type="tel" inputMode="tel" placeholder="0300 1234567" required autoComplete="tel" />
          </label>
          <button type="submit">Send code</button>
          <p className="muted small">We&apos;ll send a 6-digit code by WhatsApp or SMS. New here? This creates your account.</p>
        </form>
      ) : (
        <form action={verifyOtpAction} className="stack">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="phone" value={phone} />
          <p>Enter the code sent to {maskPhone(phone)}.</p>
          <label>
            Code
            <input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" />
          </label>
          <button type="submit">Verify</button>
          <a className="small" href={`/login?next=${encodeURIComponent(next)}`}>Use a different number</a>
        </form>
      )}
    </>
  );
}
