import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { lotState } from "@/lib/lotState";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await lotState(id, await currentUser());
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
