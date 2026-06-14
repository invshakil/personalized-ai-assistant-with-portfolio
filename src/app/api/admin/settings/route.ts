import { auth } from "@/lib/auth";
import { upsertSiteSettings } from "@/services/admin";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { availableForWork, heroTagline, heroBio, metaDescription, cvUrl } = body;

  if (typeof availableForWork !== "boolean") {
    return Response.json({ error: "availableForWork must be a boolean" }, { status: 400 });
  }

  const settings = await upsertSiteSettings({
    availableForWork,
    heroTagline,
    heroBio,
    metaDescription,
    cvUrl,
  });
  return Response.json({ data: settings });
}
