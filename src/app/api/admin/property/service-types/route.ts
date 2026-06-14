import { auth } from "@/lib/auth";
import { ExpenseCategory } from "@prisma/client";
import { NextRequest } from "next/server";
import { getServiceTypes, createServiceType } from "@/services/property";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getServiceTypes();
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.category) {
    return Response.json({ error: "name and category are required" }, { status: 400 });
  }

  const data = await createServiceType({
    name: body.name,
    category: body.category as ExpenseCategory,
    description: body.description,
  });
  return Response.json({ data }, { status: 201 });
}
