import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getPayments } from "@/services/property";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const unitId = searchParams.get("unitId") ?? undefined;
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const data = await getPayments({ month, year, tenantId, unitId, period, from, to });
  return Response.json({ data });
}
