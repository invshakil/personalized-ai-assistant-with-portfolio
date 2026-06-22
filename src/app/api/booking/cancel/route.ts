import { NextRequest } from "next/server";
import { BookingError, cancelByToken } from "@/services/booking";

export async function POST(req: NextRequest) {
  const { token, reason } = (await req.json().catch(() => ({}))) as {
    token?: string;
    reason?: string;
  };
  if (!token) return Response.json({ error: "Missing token" }, { status: 400 });
  try {
    await cancelByToken(token, reason);
    return Response.json({ data: { ok: true } });
  } catch (e) {
    if (e instanceof BookingError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    return Response.json({ error: "Cancel failed" }, { status: 500 });
  }
}
