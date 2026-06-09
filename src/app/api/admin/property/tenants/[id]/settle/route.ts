import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { PaymentStatus, TransactionType } from "@prisma/client";

// Admin-confirmed settlement: applies advance to selected payments and marks tenant as moved out.
// Body: { moveOutDate, paymentIds: string[], advanceAmounts: Record<paymentId, number> }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { moveOutDate, settlements } = body as {
    moveOutDate: string;
    // Each entry: which payment to settle and how much advance to apply
    settlements: { paymentId: string; advanceToApply: number }[];
  };

  if (!moveOutDate || !Array.isArray(settlements)) {
    return Response.json({ error: "moveOutDate and settlements[] are required" }, { status: 400 });
  }

  const tenant = await db.tenant.findUnique({
    where: { id },
    select: { id: true, unitId: true, advanceAmount: true, advancePaid: true },
  });
  if (!tenant) return Response.json({ error: "Not found" }, { status: 404 });

  let remainingAdvance = Number(tenant.advanceAmount ?? 0);

  await db.$transaction(async (tx) => {
    for (const s of settlements) {
      if (s.advanceToApply <= 0) continue;

      const applied = Math.min(s.advanceToApply, remainingAdvance);
      if (applied <= 0) continue;

      const payment = await tx.payment.findUnique({ where: { id: s.paymentId } });
      if (!payment) continue;

      const newAdvanceApplied = Number(payment.advanceApplied) + applied;
      const newAmountPaid = Number(payment.amountPaid);
      const newTotal = newAmountPaid + newAdvanceApplied;
      const newStatus: PaymentStatus =
        newTotal >= Number(payment.rentDue) ? "PAID" : newTotal > 0 ? "PARTIAL" : "PENDING";

      await tx.payment.update({
        where: { id: s.paymentId },
        data: {
          advanceApplied: newAdvanceApplied,
          status: newStatus,
          paidDate: newStatus === "PAID" ? new Date(moveOutDate) : payment.paidDate,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: s.paymentId,
          type: TransactionType.ADVANCE_APPLIED,
          amount: applied,
          date: new Date(moveOutDate),
          notes: "Settled from advance on move-out",
        },
      });

      remainingAdvance -= applied;
    }

    // Mark tenant as inactive, record move-out, settle advance
    await tx.tenant.update({
      where: { id },
      data: {
        isActive: false,
        moveOutDate: new Date(moveOutDate),
        advanceAmount: remainingAdvance,
        advanceSettled: true,
      },
    });

    // End all active services for this tenant
    await tx.tenantService.updateMany({
      where: { tenantId: id, isActive: true },
      data: { isActive: false, endDate: new Date(moveOutDate) },
    });

    // Free the unit
    if (tenant.unitId) {
      await tx.unit.update({ where: { id: tenant.unitId }, data: { isOccupied: false } });
    }
  });

  return Response.json({ data: { success: true, remainingAdvanceRefundable: remainingAdvance } });
}
