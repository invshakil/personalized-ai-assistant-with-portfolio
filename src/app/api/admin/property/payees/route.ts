import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await db.payee.findMany({
    orderBy: { name: "asc" },
  });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, role, phone, email, address, nidNumber, notes } = body;

  if (!name || !role) {
    return Response.json({ error: "name and role are required" }, { status: 400 });
  }

  const data = await db.payee.create({
    data: { name, role, phone: phone ?? null, email: email ?? null, address: address ?? null, nidNumber: nidNumber ?? null, notes: notes ?? null },
  });
  return Response.json({ data }, { status: 201 });
}
