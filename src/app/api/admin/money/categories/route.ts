import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getCategories, createCategory } from "@/services/money";
import { MoneyCategoryKind } from "@prisma/client";
import { withApiError } from "@/lib/apiRoute";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kindParam = searchParams.get("kind") ?? undefined;
  const kind =
    kindParam && kindParam in MoneyCategoryKind ? (kindParam as MoneyCategoryKind) : undefined;

  const data = await getCategories({ kind });
  return Response.json({ data });
}

export const POST = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, kind, isActive } = body;
  if (!name || !kind) {
    return Response.json({ error: "name and kind are required" }, { status: 400 });
  }
  if (!(kind in MoneyCategoryKind)) {
    return Response.json({ error: "kind must be INCOME or EXPENSE" }, { status: 400 });
  }

  const data = await createCategory({ name, kind: kind as MoneyCategoryKind, isActive });
  return Response.json({ data }, { status: 201 });
});
