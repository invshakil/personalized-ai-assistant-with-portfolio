import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { deleteTariff, updateTariff, type TariffSlabInput } from "@/services/solar";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (!body.name || !body.effectiveFrom || !Array.isArray(body.slabs) || body.slabs.length === 0) {
    return Response.json(
      { error: "name, effectiveFrom and at least one slab are required" },
      { status: 400 }
    );
  }
  const slabs: TariffSlabInput[] = body.slabs.map((s: TariffSlabInput) => ({
    fromUnit: Number(s.fromUnit),
    toUnit: s.toUnit === null || s.toUnit === undefined ? null : Number(s.toUnit),
    rate: Number(s.rate),
  }));

  const data = await updateTariff(id, {
    name: String(body.name),
    distributor: body.distributor ? String(body.distributor) : undefined,
    effectiveFrom: String(body.effectiveFrom),
    demandCharge: body.demandCharge != null ? Number(body.demandCharge) : undefined,
    vatPercent: body.vatPercent != null ? Number(body.vatPercent) : undefined,
    note: body.note ?? null,
    slabs,
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await deleteTariff(id);
  return Response.json({ data });
}
