import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { BidError, placeBid } from "@/lib/bidding";
import { lotState } from "@/lib/lotState";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Same-origin only: session cookies are SameSite=Lax, and this rejects cross-site form posts.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || new URL(origin).host !== host) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to bid." }, { status: 401 });
  if (!user.handle) return NextResponse.json({ error: "Choose a public bidder handle first." }, { status: 400 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { max?: unknown; key?: unknown } | null;
  const max = Number(body?.max);
  const key = typeof body?.key === "string" ? body.key.slice(0, 64) : null;
  if (!Number.isSafeInteger(max) || max <= 0) {
    return NextResponse.json({ error: "Enter a whole-rupee amount." }, { status: 400 });
  }

  try {
    const result = await placeBid(id, user.id, max, key);
    return NextResponse.json({ result, state: await lotState(id, user) });
  } catch (err) {
    if (err instanceof BidError) {
      return NextResponse.json({ error: err.message, code: err.code, state: await lotState(id, user) }, { status: 409 });
    }
    console.error("bid failed", err);
    return NextResponse.json({ error: "Your bid couldn't be placed. Please try again." }, { status: 500 });
  }
}
