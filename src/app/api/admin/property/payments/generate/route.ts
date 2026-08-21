import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { generatePayments } from "@/services/property";
import { withApiError } from "@/lib/apiRoute";

export const POST = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { month, year } = body as { month: number; year: number };

  if (!month || !year)
    return Response.json({ error: "month and year are required" }, { status: 400 });

  const data = await generatePayments(month, year);
  return Response.json({ data });
});
