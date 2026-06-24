import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getSolarReport } from "@/services/solar";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const data = await getSolarReport({ from, to });
  return Response.json({ data });
}
