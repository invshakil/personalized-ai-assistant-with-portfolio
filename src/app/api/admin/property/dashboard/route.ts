import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getDashboardStats } from "@/services/property";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const month = searchParams.get("month")
    ? parseInt(searchParams.get("month")!)
    : now.getMonth() + 1;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : now.getFullYear();

  const data = await getDashboardStats(month, year);
  return Response.json({ data });
}
