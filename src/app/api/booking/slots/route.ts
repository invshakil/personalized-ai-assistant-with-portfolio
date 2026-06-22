import { NextRequest } from "next/server";
import { resolveSlots } from "@/services/booking";

// Public — returns ISO start times for the chosen date + duration. Empty array
// is a valid response (means: nothing offered that day).
export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const date = u.searchParams.get("date") ?? "";
  const durationParam = u.searchParams.get("duration") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Provide date as YYYY-MM-DD" }, { status: 400 });
  }
  const duration = Number(durationParam);
  if (!Number.isFinite(duration) || duration <= 0) {
    return Response.json({ error: "Provide duration in minutes" }, { status: 400 });
  }
  const result = await resolveSlots(date, duration);
  return Response.json({ data: result });
}
