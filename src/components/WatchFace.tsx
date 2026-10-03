"use client";

import { useEffect, useRef } from "react";

// Shown when a lot has no studio photo yet. The seconds hand keeps real time.
export function WatchFace({ label }: { label: string }) {
  const sweep = useRef<SVGGElement>(null);
  useEffect(() => {
    if (sweep.current) sweep.current.style.animationDelay = `-${(Date.now() / 1000) % 60}s`;
  }, []);
  const c = 100, r = 60;
  const marks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6, rr = r - 10, len = i % 3 === 0 ? 10 : 6;
    return (
      <line key={i} x1={c + Math.sin(a) * rr} y1={c - Math.cos(a) * rr} x2={c + Math.sin(a) * (rr - len)} y2={c - Math.cos(a) * (rr - len)}
        stroke="#ecebe6" strokeWidth={i % 3 === 0 ? 3.5 : 2} strokeLinecap="round" />
    );
  });
  return (
    <svg className="watch-face" viewBox="0 0 200 200" role="img" aria-label={`${label}: photo coming soon`}>
      <rect x="68" y="8" width="64" height="184" rx="6" fill="#8f897d" opacity="0.18" />
      <rect x="170" y="93" width="10" height="14" rx="1" fill="#a3a8aa" />
      <circle cx={c} cy={c} r={r + 12} fill="#bfc3c4" />
      <circle cx={c} cy={c} r={r + 8} fill="#17191b" />
      <circle cx={c} cy={c} r={r - 2} fill="#1d2022" />
      {marks}
      <line x1={c} y1={c} x2={120} y2={82} stroke="#ecebe6" strokeWidth="5" strokeLinecap="round" />
      <line x1={c} y1={c} x2={90} y2={62} stroke="#ecebe6" strokeWidth="3.5" strokeLinecap="round" />
      <g ref={sweep} className="sweep" style={{ transformOrigin: `${c}px ${c}px` }}>
        <line x1={c} y1={c + 11} x2={c} y2={c - 48} stroke="var(--red)" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx={c} cy={c} r="2.4" fill="var(--red)" />
      </g>
    </svg>
  );
}
