import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { createObligation } from "@/services/money";
import { ObligationDirection, ObligationStatus, ObligationType } from "@prisma/client";
import { withApiError } from "@/lib/apiRoute";

export const POST = withApiError(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { type, amount, startDate } = body;
    if (!type || amount == null || !startDate) {
      return Response.json({ error: "type, amount and startDate are required" }, { status: 400 });
    }
    if (!(type in ObligationType)) {
      return Response.json({ error: "type must be RECURRING or LOAN" }, { status: 400 });
    }
    if (body.direction && !(body.direction in ObligationDirection)) {
      return Response.json({ error: "invalid direction" }, { status: 400 });
    }

    const data = await createObligation({
      beneficiaryId: id,
      type: type as ObligationType,
      direction: body.direction as ObligationDirection | undefined,
      amount: Number(amount),
      frequency: body.frequency ?? null,
      startDate,
      endDate: body.endDate ?? null,
      status: body.status as ObligationStatus | undefined,
      notes: body.notes ?? null,
    });
    return Response.json({ data }, { status: 201 });
  }
);
