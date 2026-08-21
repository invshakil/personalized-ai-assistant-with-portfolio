import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getPayeeDocuments, uploadPayeeDocument } from "@/services/property/payeeDocuments";
import { withApiError } from "@/lib/apiRoute";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await getPayeeDocuments(id);
  return Response.json({ data });
}

export const POST = withApiError(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const label = formData.get("label") as string | null;

    if (!files.length) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }

    const results = [];
    for (const file of files) {
      const doc = await uploadPayeeDocument(id, file, label ?? undefined);
      results.push(doc);
    }
    return Response.json({ data: results }, { status: 201 });
  }
);
