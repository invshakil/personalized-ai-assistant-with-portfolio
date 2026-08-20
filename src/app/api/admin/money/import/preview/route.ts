import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { previewImport, type ImportMapping } from "@/services/money";
import { withApiError } from "@/lib/apiRoute";

export const POST = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const mappingRaw = form.get("mapping");
  if (!(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }
  if (typeof mappingRaw !== "string") {
    return Response.json({ error: "mapping is required" }, { status: 400 });
  }

  let mapping: ImportMapping;
  try {
    mapping = JSON.parse(mappingRaw);
  } catch {
    return Response.json({ error: "mapping must be valid JSON" }, { status: 400 });
  }
  if (!mapping.date || !mapping.amount) {
    return Response.json(
      { error: "mapping must include date and amount columns" },
      { status: 400 }
    );
  }

  const text = await file.text();
  const data = await previewImport(text, mapping);
  return Response.json({ data });
});
