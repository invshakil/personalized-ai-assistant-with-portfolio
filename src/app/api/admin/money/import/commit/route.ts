import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { commitImport, type ImportMapping } from "@/services/money";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const mappingRaw = form.get("mapping");
  const includeDuplicates = form.get("includeDuplicates") === "true";
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
  const data = await commitImport({ fileName: file.name, text, mapping, includeDuplicates });
  return Response.json({ data }, { status: 201 });
}
