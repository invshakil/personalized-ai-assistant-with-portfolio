import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getTripReport } from "@/services/trips";

// GET — the full trip report (planned vs actual, splits, wallet, breakdowns).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await getTripReport(id);
  if (!data) return Response.json({ error: "Trip not found" }, { status: 404 });
  return Response.json({ data });
}
