import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getBeneficiaryDetail, updateBeneficiary, deleteBeneficiary } from "@/services/money";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await getBeneficiaryDetail(id);
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data = await updateBeneficiary(id, body);
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await deleteBeneficiary(id);
  return Response.json({ data });
}
