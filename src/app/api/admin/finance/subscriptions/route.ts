import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getSubscriptions, createSubscription } from "@/services/finance";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryIds = searchParams.get("categoryIds")?.split(",").filter(Boolean);
  const q = searchParams.get("q") ?? undefined;

  const data = await getSubscriptions({ categoryIds, q });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, categoryId, monthlyAmount, startDate, notes } = body;
  if (!name || !categoryId || monthlyAmount == null || !startDate) {
    return Response.json(
      { error: "name, categoryId, monthlyAmount and startDate are required" },
      { status: 400 }
    );
  }

  const data = await createSubscription({
    name,
    categoryId,
    monthlyAmount: Number(monthlyAmount),
    startDate,
    notes,
  });
  return Response.json({ data }, { status: 201 });
}
