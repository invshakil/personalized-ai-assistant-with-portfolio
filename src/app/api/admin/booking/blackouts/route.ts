import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { addBlackout, listBlackouts } from "@/services/booking";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await listBlackouts();
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { date, reason } = (await req.json()) as { date?: string; reason?: string };
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) {
    return Response.json({ error: "Provide date as YYYY-MM-DD" }, { status: 400 });
  }
  const data = await addBlackout(date, reason ?? null);
  return Response.json({ data });
}
