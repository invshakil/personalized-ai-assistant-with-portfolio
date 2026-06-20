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

  let movedOut = 0;

  // Promote FUTURE tenants whose moveInDate falls within this month (or earlier).
  const toPromote = await db.tenant.findMany({
    where: { tenantStatus: "FUTURE", isActive: true, moveInDate: { lte: monthEnd } },
    select: { id: true },
  });
  for (const t of toPromote) {
    await db.tenant.update({ where: { id: t.id }, data: { tenantStatus: "CURRENT" } });
  }

  // Enforce one CURRENT tenant per unit. When a unit has more than one current,
  // active, already-moved-in tenant (a scheduled tenant taking over from an outgoing
  // one), the latest move-in is the rightful occupant for this month; earlier tenants
  // are moved out the day before the new occupant arrived. This also repairs units
  // left with two current tenants by an earlier run.
  const occupants = await db.tenant.findMany({
    where: {
      isActive: true,
      tenantStatus: "CURRENT",
      unitId: { not: null },
      moveInDate: { lte: monthEnd },
    },
    select: { id: true, unitId: true, moveInDate: true, moveOutDate: true },
  });
  const byUnit = new Map<string, typeof occupants>();
  for (const t of occupants) {
    const group = byUnit.get(t.unitId as string) ?? [];
    group.push(t);
    byUnit.set(t.unitId as string, group);
  }
  for (const group of byUnit.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => b.moveInDate.getTime() - a.moveInDate.getTime());
    const [occupant, ...outgoing] = group;
    const defaultMoveOut = new Date(occupant.moveInDate);
    defaultMoveOut.setDate(defaultMoveOut.getDate() - 1);
    for (const o of outgoing) {
      // unitId stays set on the occupant, so the unit remains occupied.
      await db.tenant.update({
        where: { id: o.id },
        data: {
          isActive: false,
          tenantStatus: "PAST",
          unitId: null,
          moveOutDate: o.moveOutDate ?? defaultMoveOut,
        },
      });
      movedOut++;
    }
  }

  // Deactivate CURRENT tenants whose lease has ended before this month begins.
  // (A lease ending mid-month still owes this month, so only skip lease-end < monthStart.)
  const expiredLeases = await db.tenant.findMany({
    where: {
      isActive: true,
      tenantStatus: "CURRENT",
      leaseEndDate: { not: null, lt: monthStart },
    },
    select: { id: true, unitId: true, leaseEndDate: true, moveOutDate: true },
  });
  for (const t of expiredLeases) {
    await db.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: t.id },
        data: {
          isActive: false,
          tenantStatus: "PAST",
          unitId: null,
          moveOutDate: t.moveOutDate ?? t.leaseEndDate,
        },
      });
      // No successor was promoted into this unit above, so it is now vacant.
      if (t.unitId) {
        await tx.unit.update({ where: { id: t.unitId }, data: { isOccupied: false } });
      }
    });
    movedOut++;
  }

  // Clean up stale PENDING payments for tenants who are not occupying this month:
  // either not yet moved in, or already moved out before the month began. Only
  // untouched PENDING rows are removed — anything with cash/advance recorded stays.
  const stalePayments = await db.payment.findMany({
    where: {
      month,
      year,
      status: "PENDING",
      tenant: {
        OR: [{ moveInDate: { gt: monthEnd } }, { moveOutDate: { lt: monthStart } }],
      },
    },
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
    // Not yet moved in this month (e.g. advance-booked for a later month).
    if (tenant.moveInDate > monthEnd) {
      skipped++;
      continue;
    }
    // Already moved out before this month started.
    if (tenant.moveOutDate && tenant.moveOutDate < monthStart) {
      skipped++;
      continue;
    }
    // Lease ended before this month started.
    if (tenant.leaseEndDate && tenant.leaseEndDate < monthStart) {
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
    movedOut,
    rentChangesApplied: pendingChanges.length,
    tenantsPromoted: toPromote.length,
    message: `Generated ${created} new, updated ${updated} existing payment records for ${month}/${year}.`,
  };
}
