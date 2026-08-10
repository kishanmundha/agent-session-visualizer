import { NextResponse } from "next/server";
import { listSessions } from "@/lib/copilot";

export async function GET() {
  const sessions = listSessions();
  return NextResponse.json(sessions);
}
