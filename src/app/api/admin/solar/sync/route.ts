import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { runSolisSync } from "@/services/solis";

// Manual "Sync now". Reads from SolisCloud and writes local readings only —
// never writes to / controls the inverter.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let backfillDays = 0;
  try {
    const body = await req.json();
    backfillDays = Number(body?.backfillDays) || 0;
  } catch {
    /* no body — sync today only */
  }

  const result = await runSolisSync({ backfillDays });
  if (!result.ok) return Response.json({ error: result.error ?? "Sync failed" }, { status: 502 });
  return Response.json({ data: result });
}
