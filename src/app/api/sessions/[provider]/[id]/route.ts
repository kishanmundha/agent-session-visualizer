import { NextResponse } from "next/server";
import { getSession } from "@/lib/providers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ provider: string; id: string }> },
) {
  const { provider, id } = await params;
  const session = getSession(provider, id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}
