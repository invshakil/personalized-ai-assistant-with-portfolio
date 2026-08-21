import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getBackupState, updateBackupSettings, runBackup } from "@/services/admin";
import type { BackupFrequency } from "@/types";
import { withApiError } from "@/lib/apiRoute";

const FREQUENCIES: BackupFrequency[] = ["off", "daily", "weekly"];

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getBackupState();
  return Response.json({ data });
}

// PUT { frequency?, retentionCount? } → update schedule settings
export const PUT = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { frequency, retentionCount } = body;
  if (frequency !== undefined && !FREQUENCIES.includes(frequency)) {
    return Response.json({ error: "Invalid frequency" }, { status: 400 });
  }
  if (retentionCount !== undefined && (typeof retentionCount !== "number" || retentionCount < 1)) {
    return Response.json({ error: "retentionCount must be ≥ 1" }, { status: 400 });
  }

  const data = await updateBackupSettings({ frequency, retentionCount });
  return Response.json({ data });
});

// POST → run a backup now
export const POST = withApiError(async () => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runBackup("manual");
  if (!result.ok) return Response.json({ error: result.error }, { status: 500 });
  return Response.json({ data: result.record });
});
