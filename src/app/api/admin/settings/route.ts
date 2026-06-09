import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

  const settings = await db.siteSettings.upsert({
    where: { id: "singleton" },
    update: { availableForWork, heroTagline, heroBio, metaDescription, cvUrl },
    create: {
      id: "singleton",
      availableForWork,
      heroTagline: heroTagline ?? "Tech Lead & Full-Stack Engineer",
      heroBio: heroBio ?? "",
      metaDescription: metaDescription ?? "",
      metaKeywords: "",
      cvUrl: cvUrl ?? "",
    },
  });

  return Response.json({ data: settings });
}
