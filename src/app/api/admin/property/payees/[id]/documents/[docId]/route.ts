import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { readPayeeDocument, deletePayeeDocument } from "@/services/property/payeeDocuments";
import { withApiError } from "@/lib/apiRoute";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;
  const result = await readPayeeDocument(docId);
  if (!result) return Response.json({ error: "Not found" }, { status: 404 });

  return new Response(result.buffer, {
    headers: {
      "Content-Type": result.doc.mimeType,
      "Content-Disposition": `inline; filename="${result.doc.fileName}"`,
    },
  });
}

export const DELETE = withApiError(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { docId } = await params;
    const data = await deletePayeeDocument(docId);
    return Response.json({ data });
  }
);
