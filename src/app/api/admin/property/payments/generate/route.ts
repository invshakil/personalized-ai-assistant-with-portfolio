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
  // day 0 of the following month = last day of the current month
  const monthEnd = new Date(year, month, 0);

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

  // Remove stale PENDING payments for tenants whose move-in is in a future month
  const stalePayments = await db.payment.findMany({
    where: { month, year, status: "PENDING", tenant: { moveInDate: { gt: monthEnd } } },
    select: { id: true },
  });
  if (stalePayments.length > 0) {
    const staleIds = stalePayments.map((p) => p.id);
    await db.paymentTransaction.deleteMany({ where: { paymentId: { in: staleIds } } });
    await db.payment.deleteMany({ where: { id: { in: staleIds } } });
  }

  // Determine previous month for carry-forward lookup
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    if (tenant.moveInDate > monthEnd) {
      skipped++;
      continue;
    }

    const baseRent = tenant.unit ? Number(tenant.unit.monthlyRent) : 0;
    const serviceTotal = tenant.services.reduce((sum, s) => sum + Number(s.monthlyFee), 0);

    // Carry forward any unpaid balance from the previous month
    const prevPayment = await db.payment.findUnique({
      where: { tenantId_month_year: { tenantId: tenant.id, month: prevMonth, year: prevYear } },
      select: { rentDue: true, amountPaid: true, advanceApplied: true },
    });
    const carryForward = prevPayment
      ? Math.max(0, Number(prevPayment.rentDue) - Number(prevPayment.amountPaid) - Number(prevPayment.advanceApplied))
      : 0;

    const rentDue = baseRent + serviceTotal + carryForward;

    const existing = await db.payment.findUnique({
      where: { tenantId_month_year: { tenantId: tenant.id, month, year } },
    });

    if (existing) {
      // Refresh rentDue and carryForward for PENDING payments when anything has changed
      if (
        existing.status === "PENDING" &&
        (Number(existing.rentDue) !== rentDue || Number(existing.carryForward) !== carryForward)
      ) {
        await db.payment.update({ where: { id: existing.id }, data: { rentDue, carryForward } });
        updated++;
      } else {
        skipped++;
      }
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
        carryForward,
        status: "PENDING",
      },
    });
    created++;
  }

  return Response.json({
    data: {
      created,
      updated,
      skipped,
      rentChangesApplied: pendingChanges.length,
      message: `Generated ${created} new, updated ${updated} existing payment records for ${month}/${year}.`,
    },
  });
}
