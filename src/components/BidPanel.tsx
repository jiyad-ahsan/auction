"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LotState } from "@/lib/lotState";
import { bidIncrement, buyerPremium, formatLakhCrore, formatPKR } from "@/lib/money";
import { Countdown } from "./Countdown";
import { fmtPktDateTime, fmtPktShort } from "@/lib/time";

export function BidPanel({ initial }: { initial: LotState }) {
  const [state, setState] = useState(initial);
  const [amount, setAmount] = useState<string>(String(initial.min_next));
  const [message, setMessage] = useState<{ kind: "good" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const offset = useRef(new Date(initial.server_time).getTime() - Date.now());
  const touched = useRef(false);

  const apply = useCallback((s: LotState) => {
    offset.current = new Date(s.server_time).getTime() - Date.now();
    setState(s);
    if (!touched.current) setAmount(String(s.min_next));
  }, []);

  useEffect(() => {
    if (state.phase === "closed") return;
    const msLeft = new Date(state.ends_at).getTime() - (Date.now() + offset.current);
    const interval = msLeft < 5 * 60_000 ? 1500 : 4000;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lots/${state.id}`, { cache: "no-store" });
        if (res.ok) apply(await res.json());
      } catch {
        // Network blip: keep the last state, try again on the next tick.
      }
    }, interval);
    return () => clearTimeout(t);
  }, [state, apply]);

  const value = Number(amount.replace(/[^\d]/g, ""));
  const premium = value > 0 ? buyerPremium(value, state.buyer_premium_bps, state.buyer_premium_min) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!Number.isSafeInteger(value) || value < state.min_next) {
      setMessage({ kind: "bad", text: `Minimum bid is ${formatPKR(state.min_next)}.` });
      return;
    }
    const ok = window.confirm(
      `Confirm maximum bid of ${formatPKR(value)} (${formatLakhCrore(value)}).\n\n` +
        `We will bid for you only as much as needed to keep you in the lead, up to this amount.\n` +
        `If you win, you pay the hammer price plus the buyer's premium (${formatPKR(premium)} at this amount). ` +
        `Bids are binding.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/lots/${state.id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max: value, key: crypto.randomUUID() }),
      });
      const data = await res.json();
      if (data.state) {
        touched.current = false;
        apply(data.state);
      }
      if (!res.ok) {
        setMessage({ kind: "bad", text: data.error ?? "Your bid couldn't be placed." });
      } else if (data.result.outcome === "outbid") {
        setMessage({ kind: "bad", text: "Another bidder's maximum is higher. You've been outbid. Try a higher amount." });
      } else if (data.result.outcome === "max_increased") {
        setMessage({ kind: "good", text: `Your maximum is now ${formatPKR(value)}.` });
      } else {
        setMessage({ kind: "good", text: "You're the highest bidder." });
      }
    } catch {
      setMessage({ kind: "bad", text: "Connection problem. Check your bid status before trying again." });
    } finally {
      setBusy(false);
    }
  }

  const price = state.current_price ?? state.starting_price;
  const v = state.viewer;

  return (
    <div className="panel sticky">
      <div className="muted small">{state.current_price ? "Current bid" : "Starting bid"}</div>
      <div className="big-price">{formatPKR(price)}</div>
      <div className="muted small">{formatLakhCrore(price)} · {state.bid_count} bids</div>
      <p style={{ margin: "10px 0" }}>
        {!state.has_reserve ? <span className="badge good">No reserve</span> : state.reserve_met ? <span className="badge good">Reserve met</span> : <span className="badge">Reserve not met</span>}{" "}
        {v?.leading && state.phase !== "closed" && <span className="badge good">You&apos;re leading</span>}
      </p>

      {state.phase === "upcoming" && <p>Bidding opens {fmtPktDateTime(state.starts_at)}.</p>}
      {(state.phase === "live" || state.phase === "ending") && (
        <p>
          Ends in <strong><Countdown endsAt={state.ends_at} serverOffsetMs={offset.current} /></strong>
          <br />
          <span className="muted small">
            {fmtPktDateTime(state.ends_at)}. Bids in the last 2 minutes extend the auction by 2 minutes.
          </span>
        </p>
      )}
      {state.phase === "closed" && (
        <p><strong>{state.result === "sold" ? `Sold for ${formatPKR(price)}` : "Not sold"}</strong>{state.result === "unsold" && " · The consignor may accept offers. Contact us."}</p>
      )}

      {state.phase === "live" && (
        <>
          {!v ? (
            <p><Link className="button" href={`/login?next=/lots/${state.id}`}>Sign in to bid</Link></p>
          ) : !v.can_bid ? (
            <div className="notice">{v.reason} <Link href="/account">Go to your account →</Link></div>
          ) : (
            <form onSubmit={submit} className="stack" style={{ marginTop: 8 }}>
              <label>
                Your maximum bid (PKR)
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => { touched.current = true; setAmount(e.target.value); }}
                  aria-describedby="bid-help"
                />
              </label>
              <div id="bid-help" className="muted small">
                Minimum {formatPKR(state.min_next)} (increment {formatPKR(bidIncrement(price))}).
                {value > 0 && <> Buyer&apos;s premium at this amount: {formatPKR(premium)}.</>}
                {" "}Available bid limit: {formatPKR(v.available_limit)}.
                {v.your_max && <> Your current maximum: {formatPKR(v.your_max)}.</>}
              </div>
              <button type="submit" disabled={busy}>{busy ? "Placing bid…" : v.leading ? "Raise my maximum" : "Place bid"}</button>
            </form>
          )}
        </>
      )}
      {message && <div className={`notice ${message.kind}`}>{message.text}</div>}

      <h3 style={{ marginTop: 20 }}>Bid history</h3>
      {state.bids.length === 0 ? (
        <p className="muted small">No bids yet.</p>
      ) : (
        <table className="data">
          <tbody>
            {state.bids.map((b) => (
              <tr key={b.id}>
                <td>{b.handle ?? "bidder"}</td>
                <td className="price">{formatPKR(b.amount)}</td>
                <td className="muted small">{fmtPktShort(b.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
