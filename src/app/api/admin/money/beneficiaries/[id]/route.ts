import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getBeneficiaryDetail, updateBeneficiary, deleteBeneficiary } from "@/services/money";
import { withApiError } from "@/lib/apiRoute";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await getBeneficiaryDetail(id);
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data });
}

export const PUT = withApiError(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const data = await updateBeneficiary(id, body);
    return Response.json({ data });
  }
);

export const DELETE = withApiError(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    // A still-referenced record comes back as { deleted: false, error } rather
    // than throwing. Answer 400 with the reason so the client's Axios layer
    // throws like any other failure instead of the UI reading it as success.
    const data = await deleteBeneficiary(id);
    if (data && data.deleted === false) {
      return Response.json({ error: data.error }, { status: 400 });
    }
    return Response.json({ data });
  }
);
