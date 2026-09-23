"use client";

import { useEffect, useState } from "react";

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

export function Countdown({ endsAt, serverOffsetMs = 0 }: { endsAt: string; serverOffsetMs?: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <span>&nbsp;</span>;
  const ms = new Date(endsAt).getTime() - (now + serverOffsetMs);
  return <span style={{ color: ms < 120_000 && ms > 0 ? "var(--bad)" : undefined }}>{formatRemaining(ms)}</span>;
}
