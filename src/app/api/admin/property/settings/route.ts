import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getPropertySettings, updatePropertySettings } from "@/services/property";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getPropertySettings();
  return Response.json({ data });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  try {
    const data = await updatePropertySettings(body);
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
