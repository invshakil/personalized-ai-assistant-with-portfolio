import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import { getLocalBackupFile, getDriveBackupBuffer, deleteBackup } from "@/services/admin";
import { withApiError } from "@/lib/apiRoute";

// GET → download the backup file (local copy if present, else from Google Drive)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const local = await getLocalBackupFile(id);
  const data = local ? await fs.readFile(local.path) : null;
  const filename = local?.filename;

  if (data && filename) {
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(data.length),
      },
    });
  }

  // No local copy — try Google Drive.
  try {
    const drive = await getDriveBackupBuffer(id);
    if (drive) {
      return new Response(new Uint8Array(drive.buffer), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${drive.filename}"`,
          "Content-Length": String(drive.buffer.length),
        },
      });
    }
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Drive download failed" },
      { status: 502 }
    );
  }

  return Response.json({ error: "Backup file not found (local or Drive)" }, { status: 404 });
}

export const DELETE = withApiError(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await deleteBackup(id);
    return Response.json({ data: { deleted: true } });
  }
);
