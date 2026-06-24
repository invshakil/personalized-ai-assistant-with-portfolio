import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { readDocument, deleteDocument } from "@/services/property";

type RouteParams = { params: Promise<{ id: string; docId: string }> };

// Types the browser can render natively, so we serve them inline for preview.
const PREVIEWABLE = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;
  const result = await readDocument(docId);
  if (!result) return Response.json({ error: "Not found" }, { status: 404 });

  const { doc, buffer } = result;
  // Force download with ?download=1; otherwise preview previewable types inline.
  const forceDownload = req.nextUrl.searchParams.has("download");
  const disposition = !forceDownload && PREVIEWABLE.has(doc.mimeType) ? "inline" : "attachment";
  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(doc.fileName)}"`,
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
