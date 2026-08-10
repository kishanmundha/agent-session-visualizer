import { NextRequest, NextResponse } from "next/server";
import { listLogs, getLogContent } from "@/lib/copilot";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (name) {
    const content = getLogContent(name);
    return NextResponse.json({ name, content });
  }

  const logs = listLogs();
  return NextResponse.json(logs);
}
