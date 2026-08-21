import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getBusinessProfile, updateBusinessProfile } from "@/services/admin";
import { withApiError } from "@/lib/apiRoute";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getBusinessProfile();
  return Response.json({ data });
}

export const PUT = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (body.name !== undefined && !String(body.name).trim()) {
    return Response.json({ error: "Business name cannot be empty" }, { status: 400 });
  }

  const data = await updateBusinessProfile({
    name: body.name,
    tagline: body.tagline,
    address: body.address,
    phone: body.phone,
    email: body.email,
  });
  return Response.json({ data });
});
