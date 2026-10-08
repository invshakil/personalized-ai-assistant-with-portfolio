import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { listLogs, purgeLogs } from "@/services/admin";
import { withApiError } from "@/lib/apiRoute";

export const GET = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const data = await listLogs({
    level: sp.get("level") ?? undefined,
    source: sp.get("source") ?? undefined,
    q: sp.get("q") ?? undefined,
    period: sp.get("period") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    sortBy: sp.get("sortBy") ?? undefined,
    sortDir: sp.get("sortDir") ?? undefined,
    page: Number(sp.get("page")) || undefined,
    pageSize: Number(sp.get("pageSize")) || undefined,
  });
  return Response.json({ data });
});

// DELETE ?olderThanDays=N → prune (0 or omitted = clear everything)
export const DELETE = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const days = Number(new URL(req.url).searchParams.get("olderThanDays") ?? 0);
  if (!Number.isFinite(days) || days < 0) {
    return Response.json({ error: "olderThanDays must be ≥ 0" }, { status: 400 });
  }
  const removed = await purgeLogs(days);
  return Response.json({ data: { removed } });
});
