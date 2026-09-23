import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateAccountType, deleteAccountType } from "@/services/money";
import { MoneyAccountType } from "@prisma/client";
import { withApiError } from "@/lib/apiRoute";

export const PUT = withApiError(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    if (body.kind && !(body.kind in MoneyAccountType)) {
      return Response.json({ error: "invalid kind" }, { status: 400 });
    }
    if (body.isActive != null && typeof body.isActive !== "boolean") {
      return Response.json({ error: "isActive must be a boolean" }, { status: 400 });
    }
    const data = await updateAccountType(id, {
      ...(body.name !== undefined && { name: String(body.name) }),
      ...(body.isActive != null && { isActive: body.isActive }),
      ...(body.sortOrder != null && { sortOrder: Number(body.sortOrder) }),
      ...(body.kind && { kind: body.kind as MoneyAccountType }),
    });
    return Response.json({ data });
  }
);

export const DELETE = withApiError(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await deleteAccountType(id);
    if (data.deleted === false) {
      return Response.json({ error: data.error }, { status: 400 });
    }
    return Response.json({ data });
  }
);
