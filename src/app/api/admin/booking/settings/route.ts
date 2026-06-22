import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getBookingSettingsState, updateBookingSettings } from "@/services/booking";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getBookingSettingsState();
  return Response.json({ data });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const data = await updateBookingSettings(body);
  return Response.json({ data });
}
