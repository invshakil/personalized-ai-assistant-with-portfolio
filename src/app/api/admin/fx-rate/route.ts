import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getFxRateToBdt } from "@/services/_shared/fx";

// GET /api/admin/fx-rate?from=USD — live (cached) BDT conversion rate for a
// currency, used to prefill the editable rate field on foreign transactions.
// Always 200 with a FxRateResult; rate 0 / source "fallback" means "type it".
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  if (!from) return Response.json({ error: "from is required" }, { status: 400 });

  const data = await getFxRateToBdt(from);
  return Response.json({ data });
}
