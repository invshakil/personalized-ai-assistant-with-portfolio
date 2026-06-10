import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenant = await db.tenant.findUnique({
    where: { id },
    include: {
      unit: { select: { id: true, unitNumber: true, floor: true, monthlyRent: true } },
      services: {
        include: { service: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      rentChanges: { orderBy: { effectiveDate: "asc" } },
      payments: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        include: { transactions: { orderBy: { date: "desc" } } },
        take: 24,
      },
    },
  });

  if (!tenant) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({
    data: {
      ...tenant,
      advanceAmount: Number(tenant.advanceAmount ?? 0),
      moveInDate: tenant.moveInDate.toISOString(),
      moveOutDate: tenant.moveOutDate?.toISOString() ?? null,
      leaseEndDate: tenant.leaseEndDate?.toISOString() ?? null,
      unit: tenant.unit
        ? { ...tenant.unit, monthlyRent: Number(tenant.unit.monthlyRent) }
        : null,
      services: tenant.services.map((s) => ({
        id: s.id,
        serviceId: s.serviceId,
        serviceName: s.service.name,
        monthlyFee: Number(s.monthlyFee),
        startDate: s.startDate.toISOString(),
        endDate: s.endDate?.toISOString() ?? null,
        isActive: s.isActive,
        notes: s.notes,
      })),
      rentChanges: tenant.rentChanges.map((rc) => ({
        ...rc,
        previousRent: Number(rc.previousRent),
        newRent: Number(rc.newRent),
        effectiveDate: rc.effectiveDate.toISOString(),
        appliedAt: rc.appliedAt?.toISOString() ?? null,
      })),
      payments: tenant.payments.map((p) => ({
        ...p,
        rentDue: Number(p.rentDue),
        amountPaid: Number(p.amountPaid),
        advanceApplied: Number(p.advanceApplied),
        carryForward: Number(p.carryForward),
        balance: Number(p.rentDue) - Number(p.amountPaid) - Number(p.advanceApplied),
        paidDate: p.paidDate?.toISOString() ?? null,
        transactions: p.transactions.map((tx) => ({
          ...tx,
          amount: Number(tx.amount),
          date: tx.date.toISOString(),
          createdAt: tx.createdAt.toISOString(),
        })),
      })),
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const tenant = await db.tenant.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.moveInDate && { moveInDate: new Date(body.moveInDate) }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.nidNumber !== undefined && { nidNumber: body.nidNumber }),
      ...(body.leaseEndDate !== undefined && {
        leaseEndDate: body.leaseEndDate ? new Date(body.leaseEndDate) : null,
      }),
      ...(body.advancePaid !== undefined && { advancePaid: body.advancePaid }),
      ...(body.advanceAmount !== undefined && { advanceAmount: body.advanceAmount }),
      ...(body.advanceSettled !== undefined && { advanceSettled: body.advanceSettled }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });

  return Response.json({
    data: {
      ...tenant,
      advanceAmount: Number(tenant.advanceAmount ?? 0),
      moveInDate: tenant.moveInDate.toISOString(),
      moveOutDate: tenant.moveOutDate?.toISOString() ?? null,
      leaseEndDate: tenant.leaseEndDate?.toISOString() ?? null,
    },
  });
}
