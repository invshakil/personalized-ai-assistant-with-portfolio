import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateParticipant, deleteParticipant } from "@/services/trips";

// PUT edits a participant (name / beneficiary link / note / active); DELETE removes
// them (soft-delete if they have split history).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, pid } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });
  try {
    const data = await updateParticipant(id, pid, {
      ...(body.name !== undefined && { name: String(body.name) }),
      ...(body.beneficiaryId !== undefined && {
        beneficiaryId: body.beneficiaryId ? String(body.beneficiaryId) : null,
      }),
      ...(body.note !== undefined && { note: body.note }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
    });
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, pid } = await params;
  try {
    const data = await deleteParticipant(id, pid);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
