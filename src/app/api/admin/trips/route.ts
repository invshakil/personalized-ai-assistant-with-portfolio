import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getTrips, createTrip } from "@/services/trips";

// GET  /api/admin/trips        — all trips with derived totals
// POST /api/admin/trips        — create a trip
export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getTrips();
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });
  try {
    const data = await createTrip({
      name: String(body.name ?? ""),
      destination: String(body.destination ?? ""),
      localCurrency: String(body.localCurrency ?? "BDT"),
      homeCurrency: body.homeCurrency ? String(body.homeCurrency) : undefined,
      startDate: String(body.startDate ?? ""),
      endDate: body.endDate ?? null,
      status: body.status,
      localWalletAccountId: body.localWalletAccountId ?? null,
      notes: body.notes ?? null,
      publicIntro: body.publicIntro ?? null,
    });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
