import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { readDocument, deleteDocument } from "@/services/property";

type RouteParams = { params: Promise<{ id: string; docId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;
  const result = await readDocument(docId);
  if (!result) return Response.json({ error: "Not found" }, { status: 404 });

  const { doc, buffer } = result;
  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
      "Content-Length": String(doc.size),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;
  try {
    const data = await deleteDocument(docId);
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
