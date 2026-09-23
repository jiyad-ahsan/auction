import { consignRequestAction } from "@/app/actions/consign";

export default async function Consign({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { sent, error } = await searchParams;
  return (
    <>
      <h1>Sell your watch at auction</h1>
      <p className="muted" style={{ maxWidth: 680 }}>
        Tell us about your watch and a specialist will call you, usually within one business day. If it&apos;s a fit, we&apos;ll
        authenticate it, photograph it in our studio and agree a starting price and reserve with you. You&apos;re paid by bank transfer
        once the buyer has paid and collected. Seller&apos;s commission is 5% of the hammer price. There are no listing fees.
        We never publish your name or location.
      </p>
      {sent ? (
        <div className="notice good">Thank you. A specialist will be in touch shortly.</div>
      ) : (
        <form action={consignRequestAction} className="stack">
          {error && <div className="notice bad">Please enter your name, a Pakistani mobile number and the brand.</div>}
          <div className="row">
            <label>Your name<input name="name" required /></label>
            <label>Mobile number<input name="phone" type="tel" placeholder="0300 1234567" required /></label>
          </div>
          <label>City<input name="city" placeholder="Lahore, Karachi, Islamabad…" /></label>
          <div className="row">
            <label>Brand<input name="brand" placeholder="Rolex, Patek Philippe, Omega…" required /></label>
            <label>Model<input name="model" placeholder="Submariner Date" /></label>
          </div>
          <div className="row">
            <label>Reference number<input name="reference" placeholder="126610LN" /></label>
            <label>Year purchased / produced<input name="year" inputMode="numeric" /></label>
          </div>
          <label>
            Box and papers
            <select name="box_papers" defaultValue="">
              <option value="">Select…</option>
              <option>Box and papers</option>
              <option>Papers only</option>
              <option>Box only</option>
              <option>Watch only</option>
            </select>
          </label>
          <label>What do you hope to achieve? (PKR, optional)<input name="expected_price" inputMode="numeric" /></label>
          <label>Anything else (service history, condition)<textarea name="notes" /></label>
          <button type="submit">Request a call back</button>
        </form>
      )}
    </>
  );
}
