import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getUnits, createUnit } from "@/services/property";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getUnits();
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { unitNumber, floor, monthlyRent, description, notes } = body;

  if (!unitNumber || !floor || monthlyRent == null) {
    return Response.json({ error: "unitNumber, floor, and monthlyRent are required" }, { status: 400 });
  }

  const data = await createUnit({ unitNumber, floor, monthlyRent, description, notes });
  return Response.json({ data }, { status: 201 });
}
