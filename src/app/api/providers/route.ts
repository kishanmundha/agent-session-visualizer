import { NextResponse } from "next/server";
import { listProviders } from "@/lib/providers";

export async function GET() {
  return NextResponse.json(listProviders());
}
