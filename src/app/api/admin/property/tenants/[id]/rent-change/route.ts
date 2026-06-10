import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { createRentChange } from "@/services/property";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { effectiveDate, newRent, reason } = body;

  if (!effectiveDate || newRent == null) {
    return Response.json({ error: "effectiveDate and newRent are required" }, { status: 400 });
  }

  try {
    const data = await createRentChange({ tenantId: id, effectiveDate, newRent, reason });
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
