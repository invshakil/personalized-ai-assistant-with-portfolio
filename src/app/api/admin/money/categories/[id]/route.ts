import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateCategory, deleteCategory } from "@/services/money";
import { MoneyCategoryKind } from "@prisma/client";
import { withApiError } from "@/lib/apiRoute";

export const PUT = withApiError(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    if (body.kind && !(body.kind in MoneyCategoryKind)) {
      return Response.json({ error: "kind must be INCOME or EXPENSE" }, { status: 400 });
    }
    const data = await updateCategory(id, {
      ...body,
      ...(body.kind && { kind: body.kind as MoneyCategoryKind }),
    });
    return Response.json({ data });
  }
);

export const DELETE = withApiError(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    // A still-referenced record comes back as { deleted: false, error } rather
    // than throwing. Answer 400 with the reason so the client's Axios layer
    // throws like any other failure instead of the UI reading it as success.
    const data = await deleteCategory(id);
    if (data && data.deleted === false) {
      return Response.json({ error: data.error }, { status: 400 });
    }
    return Response.json({ data });
  }
);
