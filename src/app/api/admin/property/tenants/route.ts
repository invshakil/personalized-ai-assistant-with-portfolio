import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getTenants, createTenant, type TenantFilter } from "@/services/property";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const filter = (new URL(req.url).searchParams.get("filter") ?? "active") as TenantFilter;
  const data = await getTenants(filter);
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.moveInDate) {
    return Response.json({ error: "name and moveInDate are required" }, { status: 400 });
  }

  try {
    const data = await createTenant(body);
    return Response.json({ data }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
