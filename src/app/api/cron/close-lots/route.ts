import { NextResponse } from "next/server";
import { closeDueLots } from "@/lib/closing";

// Call every minute from a scheduler with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const closed = await closeDueLots();
  return NextResponse.json({ closed });
}
