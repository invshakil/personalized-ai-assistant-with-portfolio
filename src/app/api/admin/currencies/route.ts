import { auth } from "@/lib/auth";
import { getCurrencyOptions } from "@/services/_shared/fx";

// GET /api/admin/currencies — the dynamic, searchable currency list (from the FX
// feed, cached), each with a human name + display symbol. Feeds <CurrencySelect />.
export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getCurrencyOptions();
  return Response.json({ data });
}
