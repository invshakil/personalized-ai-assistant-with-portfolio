import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : now.getMonth() + 1;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : now.getFullYear();

  // ── Monthly summary ──────────────────────────────────────────────────────
  const [monthPayments, monthExpenses] = await Promise.all([
    db.payment.findMany({
      where: { month, year },
      select: { rentDue: true, amountPaid: true, advanceApplied: true, status: true },
    }),
    db.expense.findMany({
      where: { month, year },
      select: { amount: true },
    }),
  ]);

  const totalExpected = monthPayments.reduce((sum, p) => sum + Number(p.rentDue), 0);
  const totalCollected = monthPayments.reduce(
    (sum, p) => sum + Number(p.amountPaid) + Number(p.advanceApplied),
    0
  );
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const overdueCount = monthPayments.filter((p) => p.status === "OVERDUE").length;

  // ── Tenant & unit stats ──────────────────────────────────────────────────
  const [activeTenantsCount, occupiedUnits, totalUnits, advanceStats] = await Promise.all([
    db.tenant.count({ where: { isActive: true } }),
    db.unit.count({ where: { isOccupied: true } }),
    db.unit.count(),
    db.tenant.aggregate({
      where: { isActive: true, advancePaid: true },
      _count: { id: true },
      _sum: { advanceAmount: true },
    }),
  ]);

  // ── Due tracker (top 10 with outstanding balance) ──────────────────────
  const duePayments = await db.payment.findMany({
    where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
    include: {
      tenant: { select: { id: true, tenantCode: true, name: true } },
      unit: { select: { unitNumber: true } },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  type DueEntry = {
    tenantId: string;
    tenantCode: string | null;
    tenantName: string;
    unitNumber: string | null;
    totalDue: number;
    monthsUnpaid: number;
    lastPaidDate: string | null;
    alert: "OVERDUE" | "PENDING";
  };

  const dueMap = new Map<string, DueEntry>();
  for (const p of duePayments) {
    const balance = Number(p.rentDue) - Number(p.amountPaid) - Number(p.advanceApplied);
    if (balance <= 0) continue;
    const existing = dueMap.get(p.tenantId);
    if (existing) {
      existing.totalDue += balance;
      existing.monthsUnpaid += 1;
      if (p.status === "OVERDUE") existing.alert = "OVERDUE";
    } else {
      dueMap.set(p.tenantId, {
        tenantId: p.tenantId,
        tenantCode: p.tenant.tenantCode,
        tenantName: p.tenant.name,
        unitNumber: p.unit?.unitNumber ?? null,
        totalDue: balance,
        monthsUnpaid: 1,
        lastPaidDate: null,
        alert: p.status === "OVERDUE" ? "OVERDUE" : "PENDING",
      });
    }
  }

  // Fetch last paid dates
  for (const [tenantId, entry] of dueMap.entries()) {
    const lastPaid = await db.payment.findFirst({
      where: { tenantId, status: { in: ["PAID", "PARTIAL"] } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { paidDate: true },
    });
    entry.lastPaidDate = lastPaid?.paidDate?.toISOString() ?? null;
  }

  const topDue = Array.from(dueMap.values())
    .sort((a, b) => b.totalDue - a.totalDue)
    .slice(0, 10);

  // ── Yearly data ──────────────────────────────────────────────────────────
  const [yearPayments, yearExpenses] = await Promise.all([
    db.payment.findMany({
      where: { year },
      select: { month: true, amountPaid: true, advanceApplied: true },
    }),
    db.expense.findMany({
      where: { year },
      select: { month: true, amount: true },
    }),
  ]);

  const yearlyData = MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    const collected = yearPayments
      .filter((p) => p.month === m)
      .reduce((sum, p) => sum + Number(p.amountPaid) + Number(p.advanceApplied), 0);
    const expenses = yearExpenses
      .filter((e) => e.month === m)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { month: m, label, collected, expenses, netProfit: collected - expenses };
  });

  // ── Pending rent changes ─────────────────────────────────────────────────
  const pendingRentChanges = await db.rentChange.findMany({
    where: { appliedAt: null },
    include: { tenant: { select: { tenantCode: true, name: true } } },
    orderBy: { effectiveDate: "asc" },
  });

  return Response.json({
    data: {
      month,
      year,
      totalExpected,
      totalCollected,
      totalExpenses,
      netProfit: totalCollected - totalExpenses,
      activeTenantsCount,
      occupiedUnits,
      totalUnits,
      tenantsWithAdvance: advanceStats._count.id,
      totalAdvanceHeld: Number(advanceStats._sum.advanceAmount ?? 0),
      overdueCount,
      yearlyData,
      topDue,
      pendingRentChanges: pendingRentChanges.map((rc) => ({
        id: rc.id,
        tenantId: rc.tenantId,
        tenantCode: rc.tenant.tenantCode,
        tenantName: rc.tenant.name,
        effectiveDate: rc.effectiveDate.toISOString(),
        previousRent: Number(rc.previousRent),
        newRent: Number(rc.newRent),
        reason: rc.reason,
        appliedAt: null,
      })),
    },
  });
}
