// Pakistan Standard Time is UTC+5 with no daylight saving, so we format by fixed
// offset. This renders identically on server and client (Intl output varies by
// ICU build, which breaks React hydration).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

function pkt(d: Date | string) {
  const t = new Date(new Date(d).getTime() + 5 * 3600_000);
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth(), d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes() };
}

export function fmtPktDateTime(d: Date | string): string {
  const p = pkt(d);
  return `${p.d} ${MONTHS[p.mo]} ${p.y}, ${pad(p.h)}:${pad(p.mi)} PKT`;
}

export function fmtPktShort(d: Date | string): string {
  const p = pkt(d);
  return `${p.d} ${MONTHS[p.mo]}, ${pad(p.h)}:${pad(p.mi)}`;
}

export function fmtDate(d: Date | string): string {
  const p = pkt(d);
  return `${p.d} ${MONTHS[p.mo]} ${p.y}`;
}
