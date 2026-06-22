import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { adminCancel, BookingError } from "@/services/booking";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { reason } = ((await req.json().catch(() => ({}))) as { reason?: string }) ?? {};
  try {
    const data = await adminCancel(id, reason);
    return Response.json({ data });
  } catch (e) {
    if (e instanceof BookingError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    return Response.json({ error: "Cancel failed" }, { status: 500 });
  }
}
