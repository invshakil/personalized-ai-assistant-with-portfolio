import { db } from "@/lib/db";
import { toNum } from "./_serializers";

export async function generatePayments(month: number, year: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // day 0 of next month = last day of current

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

  // Promote FUTURE tenants whose moveInDate falls within this month (or earlier)
  const toPromote = await db.tenant.findMany({
    where: { tenantStatus: "FUTURE", isActive: true, moveInDate: { lte: monthEnd } },
    select: { id: true },
  });
  for (const t of toPromote) {
    await db.tenant.update({ where: { id: t.id }, data: { tenantStatus: "CURRENT" } });
  }

  // Clean up stale PENDING payments for tenants not yet moved in
  const stalePayments = await db.payment.findMany({
    where: { month, year, status: "PENDING", tenant: { moveInDate: { gt: monthEnd } } },
    select: { id: true },
  });
  if (stalePayments.length > 0) {
    const staleIds = stalePayments.map((p) => p.id);
    await db.paymentTransaction.deleteMany({ where: { paymentId: { in: staleIds } } });
    await db.payment.deleteMany({ where: { id: { in: staleIds } } });
  }

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const tenants = await db.tenant.findMany({
    where: { isActive: true, tenantStatus: "CURRENT" },
    include: {
      unit: { select: { id: true, monthlyRent: true } },
      services: { where: { isActive: true }, select: { monthlyFee: true } },
    },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    if (tenant.moveInDate > monthEnd) {
      skipped++;
      continue;
    }

    const baseRent = tenant.unit ? toNum(tenant.unit.monthlyRent) : 0;
    const serviceTotal = tenant.services.reduce((sum, s) => sum + toNum(s.monthlyFee), 0);

    const prevPayment = await db.payment.findUnique({
      where: { tenantId_month_year: { tenantId: tenant.id, month: prevMonth, year: prevYear } },
      select: { rentDue: true, amountPaid: true, advanceApplied: true },
    });
    const carryForward = prevPayment
      ? Math.max(
          0,
          toNum(prevPayment.rentDue) -
            toNum(prevPayment.amountPaid) -
            toNum(prevPayment.advanceApplied)
        )
      : 0;

    const rentDue = baseRent + serviceTotal + carryForward;

    const existing = await db.payment.findUnique({
      where: { tenantId_month_year: { tenantId: tenant.id, month, year } },
    });

    if (existing) {
      if (
        existing.status === "PENDING" &&
        (toNum(existing.rentDue) !== rentDue || toNum(existing.carryForward) !== carryForward)
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

  return {
    created,
    updated,
    skipped,
    rentChangesApplied: pendingChanges.length,
    tenantsPromoted: toPromote.length,
    message: `Generated ${created} new, updated ${updated} existing payment records for ${month}/${year}.`,
  };
}
