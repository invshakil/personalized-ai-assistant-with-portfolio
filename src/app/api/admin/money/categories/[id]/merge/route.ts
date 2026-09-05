import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { mergeCategories } from "@/services/money";
import { withApiError } from "@/lib/apiRoute";

/**
 * Merge the category in the path (the duplicate) into `targetId`, moving every
 * entry across. `deleteSource` (default true) removes the emptied duplicate.
 */
export const POST = withApiError(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    // Tolerate a missing or non-JSON body so it fails as "targetId is required"
    // rather than leaking a JSON parse error into the dialog.
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : "";
    if (!targetId) return Response.json({ error: "targetId is required" }, { status: 400 });

    const data = await mergeCategories({
      sourceId: id,
      targetId,
      deleteSource: body?.deleteSource !== false,
    });
    return Response.json({ data });
  }
);
