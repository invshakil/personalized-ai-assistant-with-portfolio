import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { month, year } = body as { month: number; year: number };

  if (!month || !year) return Response.json({ error: "month and year are required" }, { status: 400 });

  const monthStart = new Date(year, month - 1, 1);

  // Apply any pending rent changes whose effectiveDate <= first of this month
  const pendingChanges = await db.rentChange.findMany({
    where: { effectiveDate: { lte: monthStart }, appliedAt: null },
    include: { tenant: { select: { unitId: true } } },
  });

  for (const rc of pendingChanges) {
    if (rc.tenant.unitId) {
      await db.unit.update({ where: { id: rc.tenant.unitId }, data: { monthlyRent: rc.newRent } });
    }
    await db.rentChange.update({ where: { id: rc.id }, data: { appliedAt: new Date() } });
  }

  // Fetch all active tenants (both unit and external)
  const tenants = await db.tenant.findMany({
    where: { isActive: true },
    include: {
      unit: { select: { id: true, monthlyRent: true } },
      services: { where: { isActive: true }, select: { monthlyFee: true } },
    },
  });

  // Remove stale PENDING payments for tenants who haven't moved in yet this month
  const stalePayments = await db.payment.findMany({
    where: { month, year, status: "PENDING", tenant: { moveInDate: { gt: monthStart } } },
    select: { id: true },
  });
  if (stalePayments.length > 0) {
    const staleIds = stalePayments.map((p) => p.id);
    await db.paymentTransaction.deleteMany({ where: { paymentId: { in: staleIds } } });
    await db.payment.deleteMany({ where: { id: { in: staleIds } } });
  }

  let created = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    if (tenant.moveInDate > monthStart) {
      skipped++;
      continue;
    }

    const baseRent = tenant.unit ? Number(tenant.unit.monthlyRent) : 0;
    const serviceTotal = tenant.services.reduce((sum, s) => sum + Number(s.monthlyFee), 0);
    const rentDue = baseRent + serviceTotal;

    const existing = await db.payment.findUnique({
      where: { tenantId_month_year: { tenantId: tenant.id, month, year } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.payment.create({
      data: {
        tenantId: tenant.id,
        unitId: tenant.unitId ?? null,
        month,
        year,
        rentDue,
        amountPaid: 0,
        advanceApplied: 0,
        status: "PENDING",
      },
    });
    created++;
  }

  return Response.json({
    data: {
      created,
      skipped,
      rentChangesApplied: pendingChanges.length,
      message: `Generated ${created} payment records for ${month}/${year}. ${skipped} already existed.`,
    },
  });
}
