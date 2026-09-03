import { NextRequest, NextResponse } from "next/server";
import { getLogContent, listLogs } from "@/lib/providers";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name");
  const provider = searchParams.get("provider") ?? undefined;

  if (name) {
    // Logs are only exposed by providers that declare a log directory.
    const content = getLogContent(provider ?? "copilot", name);
    return NextResponse.json({ name, content });
  }

  return NextResponse.json(listLogs(provider));
}
