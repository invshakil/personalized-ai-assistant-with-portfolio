import { auth } from "@/lib/auth";
import { ExpenseCategory } from "@prisma/client";
import { NextRequest } from "next/server";
import { updateServiceType, deactivateServiceType } from "@/services/property";
import { withApiError } from "@/lib/apiRoute";

export const PUT = withApiError(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const data = await updateServiceType(id, {
      ...body,
      ...(body.category && { category: body.category as ExpenseCategory }),
    });
    return Response.json({ data });
  }
);

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const data = await deactivateServiceType(id);
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
