import { NextResponse } from "next/server";
import {
  getSessionMeta,
  getSessionEvents,
  getSessionFiles,
  getSessionCheckpoints,
  getSessionResearch,
  getWorkspaceYaml,
  computeSessionStats,
  analyzeTokenUsage,
} from "@/lib/copilot";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meta = getSessionMeta(id);
  if (!meta) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const [events, files, checkpoints, research, workspaceYaml] =
    await Promise.all([
      getSessionEvents(id),
      Promise.resolve(getSessionFiles(id)),
      Promise.resolve(getSessionCheckpoints(id)),
      Promise.resolve(getSessionResearch(id)),
      Promise.resolve(getWorkspaceYaml(id)),
    ]);

  const stats = computeSessionStats(events);
  const tokenAnalysis = analyzeTokenUsage(events);

  return NextResponse.json({
    meta,
    events,
    files,
    checkpoints,
    research,
    workspaceYaml,
    stats,
    tokenAnalysis,
  });
}
