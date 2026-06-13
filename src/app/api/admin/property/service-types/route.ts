import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExpenseCategory } from "@prisma/client";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await db.propertyServiceType.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, category, description } = body;

  if (!name || !category) {
    return Response.json({ error: "name and category are required" }, { status: 400 });
  }

  const data = await db.propertyServiceType.create({
    data: { name, category: category as ExpenseCategory, description: description ?? null },
  });
  return Response.json({ data }, { status: 201 });
}
