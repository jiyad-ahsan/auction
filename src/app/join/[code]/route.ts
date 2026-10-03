import { NextResponse } from "next/server";

// Invite links shared in WhatsApp groups: /join/LHR-VINTAGE
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
  return NextResponse.redirect(new URL(`/login?invite=${encodeURIComponent(clean)}`, req.url));
}
