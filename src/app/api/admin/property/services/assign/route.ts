import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { assignService } from "@/services/property";
import { withApiError } from "@/lib/apiRoute";

export const POST = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId, serviceId, monthlyFee, startDate, notes } = await req.json();

  if (!tenantId || !serviceId || monthlyFee == null || !startDate) {
    return Response.json(
      { error: "tenantId, serviceId, monthlyFee, startDate are required" },
      { status: 400 }
    );
  }

  const data = await assignService({ tenantId, serviceId, monthlyFee, startDate, notes });
  return Response.json({ data }, { status: 201 });
});
