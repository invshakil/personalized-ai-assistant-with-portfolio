import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import { getLocalBackupFile, deleteBackup } from "@/services/admin";

// GET → download the local backup file
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await getLocalBackupFile(id);
  if (!file) {
    return Response.json({ error: "Backup file not found on this server" }, { status: 404 });
  }

  const data = await fs.readFile(file.path);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Content-Length": String(data.length),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteBackup(id);
  return Response.json({ data: { deleted: true } });
}
