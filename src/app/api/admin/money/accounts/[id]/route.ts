import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateAccount, deleteAccount } from "@/services/money";
import { MoneyAccountType } from "@prisma/client";
import { withApiError } from "@/lib/apiRoute";

export const PUT = withApiError(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    if (body.type && !(body.type in MoneyAccountType)) {
      return Response.json({ error: "invalid account type" }, { status: 400 });
    }
    const data = await updateAccount(id, {
      ...body,
      ...(body.type && { type: body.type as MoneyAccountType }),
      ...(body.openingBalance != null && { openingBalance: Number(body.openingBalance) }),
      ...(body.creditLimit !== undefined && {
        creditLimit: body.creditLimit == null ? null : Number(body.creditLimit),
      }),
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
    const data = await deleteAccount(id);
    if (data && data.deleted === false) {
      return Response.json({ error: data.error }, { status: 400 });
    }
    return Response.json({ data });
  }
);
