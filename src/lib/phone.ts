// Normalise Pakistani mobile numbers to E.164 (+923XXXXXXXXX).
// Accepts 03001234567, 3001234567, 923001234567, +92 300 1234567.
export function normalizePkPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let national: string;
  if (/^923\d{9}$/.test(digits)) national = digits.slice(2);
  else if (/^03\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^3\d{9}$/.test(digits)) national = digits;
  else return null;
  return "+92" + national;
}

export function maskPhone(e164: string): string {
  return e164.slice(0, 6) + "•••" + e164.slice(-3);
}
