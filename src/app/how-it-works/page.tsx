import { formatPKR } from "@/lib/money";

const INCREMENTS: [string, number][] = [
  ["Under PKR 50,000", 1_000],
  ["PKR 50,000 – 199,999", 2_500],
  ["PKR 200,000 – 499,999", 5_000],
  ["PKR 500,000 – 999,999", 10_000],
  ["PKR 1,000,000 – 2,499,999", 25_000],
  ["PKR 2,500,000 – 4,999,999", 50_000],
  ["PKR 5,000,000 – 9,999,999", 100_000],
  ["PKR 10,000,000 – 24,999,999", 250_000],
  ["PKR 25,000,000 – 49,999,999", 500_000],
  ["PKR 50,000,000 and above", 1_000_000],
];

export default function HowItWorks() {
  return (
    <div style={{ maxWidth: 760 }}>
      <h1>How it works</h1>

      <h2>For buyers</h2>
      <ol>
        <li><strong>Sign in</strong> with your mobile number and choose a public bidder handle. Your name is never shown.</li>
        <li><strong>Verify your identity</strong> with your CNIC. Every bidder is verified, so every competing bid is real.</li>
        <li><strong>Place a refundable deposit</strong> by Raast, IBFT or pay order. Your bid limit is 20× your deposit.</li>
        <li><strong>Bid.</strong> Enter the most you&apos;re willing to pay. We bid on your behalf only as much as needed to keep you in the lead.</li>
        <li><strong>Win and pay</strong> the hammer price plus buyer&apos;s premium within 3 business days, by bank transfer.</li>
        <li><strong>Collect</strong> at our secure viewing room, where you can inspect the watch before you sign for it.</li>
      </ol>

      <h2>Auction rules</h2>
      <ul>
        <li>Auctions run for 7 days and end in the evening, Pakistan time.</li>
        <li><strong>Soft close:</strong> a bid in the final 2 minutes extends the auction by 2 minutes, so there&apos;s no last-second sniping.</li>
        <li>Some lots have a confidential reserve. You&apos;ll see whether it has been met. &quot;No reserve&quot; lots sell to the highest bidder.</li>
        <li>Bids are binding and can&apos;t be withdrawn. If we make an obvious keying error, contact us immediately.</li>
        <li><strong>No shill bidding.</strong> Sellers and anyone connected to them are barred from bidding on their own lots. We monitor for it and ban offenders.</li>
        <li>If our platform or national connectivity is disrupted near a close, we extend affected lots and notify all bidders.</li>
        <li>Winning bidders who don&apos;t pay forfeit their deposit and lose bidding access.</li>
      </ul>

      <h2>Fees</h2>
      <ul>
        <li>Buyer&apos;s premium: 7.5% of the hammer price (minimum {formatPKR(15_000)}).</li>
        <li>Seller&apos;s commission: 5% of the hammer price. No listing fee for watches.</li>
        <li>Applicable taxes are shown on your invoice.</li>
      </ul>

      <h2>Bid increments</h2>
      <table className="data"><thead><tr><th>Current bid</th><th>Increment</th></tr></thead>
        <tbody>{INCREMENTS.map(([r, i]) => <tr key={r}><td>{r}</td><td>{formatPKR(i)}</td></tr>)}</tbody>
      </table>

      <h2>Our authenticity guarantee</h2>
      <p>
        Every watch is examined by our specialists before listing: case opened, movement inspected, serial and reference checked,
        and a timegrapher reading taken. If a watch you buy is shown to be not authentic or materially misdescribed within
        12 months of handover, we refund everything you paid.
      </p>

      <h2>Payments and your money</h2>
      <p>
        Deposits and purchase payments go into a segregated client account, never our operating account. Sellers are paid
        only after the buyer has paid and collected the watch. We confirm every payment against our bank statement.
        Screenshots are not proof of payment. We do not accept cash.
      </p>
    </div>
  );
}
