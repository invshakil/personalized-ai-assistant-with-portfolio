import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getMoneyDashboard } from "@/services/money";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const data = await getMoneyDashboard({
    period: searchParams.get("period") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  return Response.json({ data });
}
