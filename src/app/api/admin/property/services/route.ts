import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getServices, createService } from "@/services/property";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getServices();
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  const data = await createService(name, description);
  return Response.json({ data }, { status: 201 });
}
