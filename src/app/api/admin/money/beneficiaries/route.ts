import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getBeneficiaries, createBeneficiary } from "@/services/money";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getBeneficiaries();
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name) return Response.json({ error: "name is required" }, { status: 400 });

  const data = await createBeneficiary({
    name: body.name,
    relationship: body.relationship ?? null,
    phone: body.phone ?? null,
    isActive: body.isActive,
    notes: body.notes ?? null,
  });
  return Response.json({ data }, { status: 201 });
}
