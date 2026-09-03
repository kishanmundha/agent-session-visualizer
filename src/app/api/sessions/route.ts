import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/providers";

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider") ?? undefined;
  return NextResponse.json(listSessions(provider));
}
