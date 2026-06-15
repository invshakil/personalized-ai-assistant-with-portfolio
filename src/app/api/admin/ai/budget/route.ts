import { auth } from "@/lib/auth";
import { getBudget, setBudget } from "@/services/ai";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await getBudget() });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const enforce = body?.enforce === true;
  const monthlyLimitUsd =
    body?.monthlyLimitUsd === null ||
    body?.monthlyLimitUsd === undefined ||
    body?.monthlyLimitUsd === ""
      ? null
      : Number(body.monthlyLimitUsd);

  try {
    const data = await setBudget({ monthlyLimitUsd, enforce });
    return Response.json({ data });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to save budget." },
      { status: 400 }
    );
  }
}
