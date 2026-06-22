import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { listBookings } from "@/services/booking";
import type { BookingStatus } from "@/types";

const STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CANCELLED"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const u = new URL(req.url);
  const statusParam = u.searchParams.get("status");
  const status = STATUSES.find((s) => s === statusParam);
  const windowParam = u.searchParams.get("window") as "upcoming" | "past" | "all" | null;
  const data = await listBookings({
    status,
    window: windowParam === "upcoming" || windowParam === "past" ? windowParam : "all",
    from: u.searchParams.get("from") ?? undefined,
    to: u.searchParams.get("to") ?? undefined,
    q: u.searchParams.get("q") ?? undefined,
  });
  return Response.json({ data });
}
