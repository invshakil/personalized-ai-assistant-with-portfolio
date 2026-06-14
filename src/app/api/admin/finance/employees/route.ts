import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getEmployees, createEmployee } from "@/services/finance";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getEmployees();
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name) return Response.json({ error: "name is required" }, { status: 400 });

  const data = await createEmployee({
    name: body.name,
    phone: body.phone,
    isActive: body.isActive,
    notes: body.notes,
  });
  return Response.json({ data }, { status: 201 });
}
