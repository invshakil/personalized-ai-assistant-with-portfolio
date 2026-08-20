import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getPayees, createPayee } from "@/services/property";
import { withApiError } from "@/lib/apiRoute";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getPayees();
  return Response.json({ data });
}

export const POST = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.role) {
    return Response.json({ error: "name and role are required" }, { status: 400 });
  }

  const data = await createPayee(body);
  return Response.json({ data }, { status: 201 });
});
